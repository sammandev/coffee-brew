import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { buildForumThreadSlug, isLikelyUuid, normalizeTagList } from "@/lib/forum";
import { notifyMentions } from "@/lib/forum-mentions";
import { applyForumReputation } from "@/lib/forum-reputation";
import { isSuspiciousForumContent, verifyTurnstileToken } from "@/lib/forum-spam";
import { requirePermission } from "@/lib/guards";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumThreadListQuerySchema, forumThreadSchema } from "@/lib/validators";

function parseFirstParam(value: string | string[] | null) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export async function GET(request: Request) {
	const supabase = await createSupabaseServerClient();
	const url = new URL(request.url);
	const raw = {
		subforum: parseFirstParam(url.searchParams.getAll("subforum")),
		q: parseFirstParam(url.searchParams.getAll("q")),
		tag: parseFirstParam(url.searchParams.getAll("tag")),
		author: parseFirstParam(url.searchParams.getAll("author")),
		from: parseFirstParam(url.searchParams.getAll("from")),
		to: parseFirstParam(url.searchParams.getAll("to")),
		sort: parseFirstParam(url.searchParams.getAll("sort")) || "latest",
		page: parseFirstParam(url.searchParams.getAll("page")) || "1",
		perPage: parseFirstParam(url.searchParams.getAll("perPage")) || "12",
	};
	const parsedQuery = forumThreadListQuerySchema.safeParse(raw);
	if (!parsedQuery.success) {
		return apiError("Invalid query", 400, parsedQuery.error.message);
	}

	const queryParams = parsedQuery.data;
	let subforumId = queryParams.subforum?.trim() || "";
	if (subforumId.length > 0 && !isLikelyUuid(subforumId)) {
		const { data: subforum } = await supabase
			.from("forum_subforums")
			.select("id")
			.eq("slug", subforumId.toLowerCase())
			.maybeSingle();
		if (!subforum) {
			return apiOk({ threads: [], page: queryParams.page, perPage: queryParams.perPage, total: 0 });
		}
		subforumId = subforum.id;
	}

	let authorIds: string[] | null = null;
	if (queryParams.author?.trim()) {
		const search = queryParams.author.trim();
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id")
			.or(`display_name.ilike.%${search}%,mention_handle.ilike.%${search}%,email.ilike.%${search}%`)
			.limit(100);
		authorIds = (profiles ?? []).map((profile) => profile.id);
		if (authorIds.length === 0) {
			return apiOk({ threads: [], page: queryParams.page, perPage: queryParams.perPage, total: 0 });
		}
	}

	const fromIndex = (queryParams.page - 1) * queryParams.perPage;
	const toIndex = fromIndex + queryParams.perPage - 1;

	let query = supabase
		.from("forum_threads")
		.select(
			"id, title, content, tags, author_id, subforum_id, created_at, updated_at, status, slug, is_locked, is_pinned",
			{ count: "exact" },
		)
		.eq("status", "visible")
		.is("deleted_at", null);

	if (subforumId.length > 0) {
		query = query.eq("subforum_id", subforumId);
	}

	if (queryParams.q?.trim()) {
		const q = queryParams.q.trim();
		query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
	}

	if (queryParams.tag?.trim()) {
		query = query.contains("tags", [queryParams.tag.trim().toLowerCase()]);
	}

	if (authorIds) {
		query = query.in("author_id", authorIds);
	}

	if (queryParams.from) {
		query = query.gte("created_at", queryParams.from);
	}

	if (queryParams.to) {
		query = query.lte("created_at", queryParams.to);
	}

	if (queryParams.sort === "oldest") {
		query = query.order("created_at", { ascending: true });
	} else if (queryParams.sort === "latest") {
		query = query.order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
	} else {
		query = query.order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
	}

	query = query.range(fromIndex, toIndex);

	const { data, count, error } = await query;

	if (error) {
		return apiError("Could not load forum threads", 400, error.message);
	}

	let rows = data ?? [];
	if ((queryParams.sort === "most_reacted" || queryParams.sort === "most_discussed") && rows.length > 0) {
		const threadIds = rows.map((row) => row.id);
		const [{ data: reactions }, { data: comments }] = await Promise.all([
			queryParams.sort === "most_reacted"
				? supabase.from("forum_reactions").select("target_id").eq("target_type", "thread").in("target_id", threadIds)
				: Promise.resolve({ data: [] as Array<{ target_id: string }> }),
			queryParams.sort === "most_discussed"
				? supabase.from("forum_comments").select("thread_id").eq("status", "visible").in("thread_id", threadIds)
				: Promise.resolve({ data: [] as Array<{ thread_id: string }> }),
		]);

		const reactionCountMap = new Map<string, number>();
		for (const reaction of reactions ?? []) {
			reactionCountMap.set(reaction.target_id, (reactionCountMap.get(reaction.target_id) ?? 0) + 1);
		}
		const commentCountMap = new Map<string, number>();
		for (const comment of comments ?? []) {
			commentCountMap.set(comment.thread_id, (commentCountMap.get(comment.thread_id) ?? 0) + 1);
		}
		rows = [...rows].sort((left, right) => {
			if (queryParams.sort === "most_reacted") {
				return (reactionCountMap.get(right.id) ?? 0) - (reactionCountMap.get(left.id) ?? 0);
			}
			return (commentCountMap.get(right.id) ?? 0) - (commentCountMap.get(left.id) ?? 0);
		});
	}

	return apiOk({
		threads: rows,
		page: queryParams.page,
		perPage: queryParams.perPage,
		total: count ?? 0,
	});
}

export async function POST(request: Request) {
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const body = await request.json();
	const turnstileToken: string | null =
		body && typeof body === "object" && typeof (body as Record<string, unknown>).turnstileToken === "string"
			? ((body as Record<string, unknown>).turnstileToken as string)
			: null;
	const normalizedBody = (() => {
		if (!body || typeof body !== "object") return body;
		const payload = body as Record<string, unknown>;
		const content = typeof payload.content === "string" ? payload.content : "";
		return {
			...payload,
			content: sanitizeForStorage(content),
		};
	})();
	const parsed = forumThreadSchema.safeParse(normalizedBody);

	if (!parsed.success) {
		return apiError("Invalid thread payload", 400, parsed.error.message);
	}

	if (!validatePlainTextLength(parsed.data.content, { min: 4, max: 6000 })) {
		return apiError("Invalid thread payload", 400, "Thread content must be between 4 and 6000 characters.");
	}

	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}
	const { data: subforum } = await supabase
		.from("forum_subforums")
		.select("id, is_visible")
		.eq("id", parsed.data.subforumId)
		.maybeSingle();
	if (!subforum) {
		return apiError("Sub-forum not found", 404);
	}

	const [{ data: actorProfile }, { data: actorTrustProfile }] = await Promise.all([
		supabase
			.from("profiles")
			.select("display_name, email")
			.eq("id", permission.context.userId)
			.maybeSingle<{ display_name: string | null; email: string | null }>(),
		supabase.from("profiles").select("created_at, karma_points").eq("id", permission.context.userId).maybeSingle(),
	]);
	const actorCreatedAt = actorTrustProfile?.created_at ? new Date(actorTrustProfile.created_at).getTime() : Date.now();
	const accountAgeDays = Math.max(0, (Date.now() - actorCreatedAt) / (24 * 60 * 60 * 1000));
	const karmaPoints = Number(actorTrustProfile?.karma_points ?? 0);
	const lowTrust = karmaPoints < 50 || accountAgeDays < 7;

	if (lowTrust && turnstileToken) {
		const turnstile = await verifyTurnstileToken(turnstileToken, request.headers.get("x-forwarded-for"));
		if (!turnstile.ok) {
			return apiError("Security verification required", 400, turnstile.error);
		}
	}

	const tags = normalizeTagList(parsed.data.tags);
	const slugBase = buildForumThreadSlug(parsed.data.title);
	const { data: slugMatches } = await supabase
		.from("forum_threads")
		.select("id")
		.like("slug", `${slugBase}%`)
		.limit(500);
	const slug = slugMatches && slugMatches.length > 0 ? `${slugBase}-${slugMatches.length + 1}` : slugBase;

	const { data, error } = await supabase
		.from("forum_threads")
		.insert({
			author_id: permission.context.userId,
			subforum_id: parsed.data.subforumId,
			title: parsed.data.title,
			content: parsed.data.content,
			tags,
			slug,
			status: "visible",
		})
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create thread", 400, error.message);
	}

	const actorName = actorProfile?.display_name?.trim() || actorProfile?.email || "Someone";
	await applyForumReputation({
		userId: permission.context.userId,
		actorId: permission.context.userId,
		eventType: "thread_create",
		sourceType: "thread",
		sourceId: data.id as string,
	});

	await notifyMentions({
		actorId: permission.context.userId,
		actorName,
		content: parsed.data.content,
		title: `${actorName} mentioned you in a thread`,
		linkPath: `/forum/${data.id}`,
		metadata: { thread_id: data.id },
	});

	if (isSuspiciousForumContent(parsed.data.content)) {
		await supabase.from("forum_reports").insert({
			reporter_id: permission.context.userId,
			target_type: "thread",
			target_id: data.id,
			reason: "Automatic spam review",
			detail: "System detected suspicious link pattern in thread content.",
			status: "open",
			metadata: { auto_flagged: true },
		});
	}

	return apiOk({ thread: data }, 201);
}
