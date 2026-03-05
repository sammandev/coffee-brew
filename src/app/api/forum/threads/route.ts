import { apiError, apiOk } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
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

function escapeLikePattern(value: string) {
	return value.replace(/[%_\\]/g, "\\$&");
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
		const search = escapeLikePattern(queryParams.author.trim());
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id")
			.or(`display_name.ilike.%${search}%,mention_handle.ilike.%${search}%`)
			.limit(100);
		authorIds = (profiles ?? []).map((profile) => profile.id);
		if (authorIds.length === 0) {
			return apiOk({ threads: [], page: queryParams.page, perPage: queryParams.perPage, total: 0 });
		}
	}

	const fromIndex = (queryParams.page - 1) * queryParams.perPage;
	const toIndex = fromIndex + queryParams.perPage - 1;
	const needsComputedSort = queryParams.sort === "most_reacted" || queryParams.sort === "most_discussed";

	// For computed sorts (most_reacted / most_discussed) we need to rank the full
	// result set before applying pagination. We do this in two passes:
	//   1. Fetch all matching thread IDs (no content — minimal payload).
	//   2. Call the pre-built RPC to get aggregate counts for those IDs.
	//   3. Sort IDs by count descending, slice to the requested page window.
	//   4. Fetch full thread rows only for the page of IDs.
	if (needsComputedSort) {
		let idQuery = supabase
			.from("forum_threads")
			.select("id, is_pinned, updated_at", { count: "exact" })
			.eq("status", "visible")
			.is("deleted_at", null);

		if (subforumId.length > 0) idQuery = idQuery.eq("subforum_id", subforumId);
		if (queryParams.q?.trim()) {
			const q = escapeLikePattern(queryParams.q.trim());
			idQuery = idQuery.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
		}
		if (queryParams.tag?.trim()) idQuery = idQuery.contains("tags", [queryParams.tag.trim().toLowerCase()]);
		if (authorIds) idQuery = idQuery.in("author_id", authorIds);
		if (queryParams.from) idQuery = idQuery.gte("created_at", queryParams.from);
		if (queryParams.to) idQuery = idQuery.lte("created_at", queryParams.to);

		const { data: allIdRows, count: totalCount, error: idError } = await idQuery;
		if (idError) {
			return apiError("Could not load forum threads", 500, idError.message);
		}

		const allIds = (allIdRows ?? []).map((row) => row.id);
		if (allIds.length === 0) {
			return apiOk({ threads: [], page: queryParams.page, perPage: queryParams.perPage, total: 0 });
		}

		const [{ data: reactionTotals }, { data: commentTotals }] = await Promise.all([
			queryParams.sort === "most_reacted"
				? supabase.rpc("get_forum_thread_reaction_totals", { thread_ids: allIds })
				: Promise.resolve({ data: [] as Array<{ thread_id: string; reaction_total: number }> }),
			queryParams.sort === "most_discussed"
				? supabase.rpc("get_forum_thread_comment_totals", { thread_ids: allIds })
				: Promise.resolve({ data: [] as Array<{ thread_id: string; comment_total: number }> }),
		]);

		const reactionCountMap = new Map<string, number>(
			(reactionTotals ?? []).map((row: { thread_id: string; reaction_total: number }) => [
				row.thread_id,
				Number(row.reaction_total),
			]),
		);
		const commentCountMap = new Map<string, number>(
			(commentTotals ?? []).map((row: { thread_id: string; comment_total: number }) => [
				row.thread_id,
				Number(row.comment_total),
			]),
		);

		const idRowMap = new Map((allIdRows ?? []).map((row) => [row.id, row]));
		const sortedIds = [...allIds].sort((leftId, rightId) => {
			if (queryParams.sort === "most_reacted") {
				const diff = (reactionCountMap.get(rightId) ?? 0) - (reactionCountMap.get(leftId) ?? 0);
				if (diff !== 0) return diff;
			} else {
				const diff = (commentCountMap.get(rightId) ?? 0) - (commentCountMap.get(leftId) ?? 0);
				if (diff !== 0) return diff;
			}
			const leftRow = idRowMap.get(leftId);
			const rightRow = idRowMap.get(rightId);
			if (leftRow?.is_pinned !== rightRow?.is_pinned) return rightRow?.is_pinned ? 1 : -1;
			return new Date(rightRow?.updated_at ?? 0).getTime() - new Date(leftRow?.updated_at ?? 0).getTime();
		});

		const pageIds = sortedIds.slice(fromIndex, toIndex + 1);
		if (pageIds.length === 0) {
			return apiOk({ threads: [], page: queryParams.page, perPage: queryParams.perPage, total: totalCount ?? 0 });
		}

		const { data: pageThreads, error: pageError } = await supabase
			.from("forum_threads")
			.select(
				"id, title, content, tags, author_id, subforum_id, created_at, updated_at, status, slug, is_locked, is_pinned",
			)
			.in("id", pageIds);
		if (pageError) {
			return apiError("Could not load forum threads", 500, pageError.message);
		}

		// Re-order results to match the sorted ID order.
		const threadRowMap = new Map((pageThreads ?? []).map((thread) => [thread.id, thread]));
		const orderedThreads = pageIds.map((id) => threadRowMap.get(id)).filter(Boolean);

		return apiOk({
			threads: orderedThreads,
			page: queryParams.page,
			perPage: queryParams.perPage,
			total: totalCount ?? 0,
		});
	}

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
		const q = escapeLikePattern(queryParams.q.trim());
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
	} else {
		query = query.order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
	}

	query = query.range(fromIndex, toIndex);

	const { data, count, error } = await query;

	if (error) {
		return apiError("Could not load forum threads", 500, error.message);
	}

	return apiOk({
		threads: data ?? [],
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
	const { data: subforum } = await supabase
		.from("forum_subforums")
		.select("id, is_visible")
		.eq("id", parsed.data.subforumId)
		.maybeSingle();
	if (!subforum) {
		return apiError("Sub-forum not found", 404);
	}
	// M-6: Invisible subforums are only accessible to admins and superusers.
	if (!subforum.is_visible && permission.context.role === "user") {
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

	if (lowTrust) {
		if (!turnstileToken) {
			return apiError("Security verification required", 400, "Captcha token missing.");
		}
		const turnstile = await verifyTurnstileToken(turnstileToken, request.headers.get("x-forwarded-for"));
		if (!turnstile.ok) {
			return apiError("Security verification required", 400, turnstile.error);
		}
	}

	const tags = normalizeTagList(parsed.data.tags);
	const slugBase = buildForumThreadSlug(parsed.data.title);

	// Resolve a unique slug by attempting the base slug first, then appending
	// an incrementing suffix. The DB has a unique constraint on slug so the
	// insert itself is the final race-free guard; this loop just avoids
	// predictable conflicts on the happy path.
	const MAX_SLUG_ATTEMPTS = 10;
	let data: Record<string, unknown> | null = null;
	let lastError: { message: string; code?: string } | null = null;
	for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
		const slug = attempt === 1 ? slugBase : `${slugBase}-${attempt}`;

		const result = await supabase
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
			.select(
				"id, author_id, subforum_id, title, content, slug, tags, status, is_locked, is_pinned, created_at, updated_at",
			)
			.single();

		if (!result.error) {
			data = result.data as Record<string, unknown>;
			lastError = null;
			break;
		}

		// Unique constraint violation on slug — retry with next suffix
		if (result.error.code === "23505" && attempt < MAX_SLUG_ATTEMPTS) {
			continue;
		}

		lastError = result.error;
		break;
	}

	if (lastError || !data) {
		return apiError("Could not create thread", 500, lastError?.message);
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
			reporter_id: null, // System-generated report — see metadata.auto_flagged
			target_type: "thread",
			target_id: data.id,
			reason: "Automatic spam review",
			detail: "System detected suspicious link pattern in thread content.",
			status: "open",
			metadata: { auto_flagged: true },
		});
	}

	revalidatePublicCache([CACHE_TAGS.FORUM, CACHE_TAGS.LANDING]);

	return apiOk({ thread: data }, 201);
}
