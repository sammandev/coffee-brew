import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { buildForumThreadSlug, normalizeTagList } from "@/lib/forum";
import { notifyMentions } from "@/lib/forum-mentions";
import { requirePermission } from "@/lib/guards";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumThreadUpdateSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("forum", "update");
	if (permission.response) return permission.response;
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const normalizedBody =
		body && typeof body === "object" && typeof (body as Record<string, unknown>).content === "string"
			? { ...body, content: sanitizeForStorage((body as Record<string, unknown>).content as string) }
			: body;
	const parsed = forumThreadUpdateSchema.safeParse(normalizedBody);
	if (!parsed.success) {
		return apiError("Invalid thread update payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data: thread } = await supabase
		.from("forum_threads")
		.select("id, author_id, is_locked, status")
		.eq("id", id)
		.maybeSingle();
	if (!thread) {
		return apiError("Thread not found", 404);
	}

	const isOwner = thread.author_id === session.userId;
	const isModerator = session.role === "admin" || session.role === "superuser";
	if (!isOwner && !isModerator) {
		return apiError("Forbidden", 403);
	}
	if (thread.is_locked && !isModerator) {
		return apiError("Thread is locked", 403);
	}

	if (typeof parsed.data.content === "string" && !validatePlainTextLength(parsed.data.content, { min: 4, max: 6000 })) {
		return apiError("Invalid thread payload", 400, "Thread content must be between 4 and 6000 characters.");
	}

	const patch: Record<string, unknown> = {};
	if (typeof parsed.data.title === "string") {
		patch.title = parsed.data.title;
		patch.slug = buildForumThreadSlug(parsed.data.title);
	}
	if (typeof parsed.data.content === "string") {
		patch.content = parsed.data.content;
	}
	if (Array.isArray(parsed.data.tags)) {
		patch.tags = normalizeTagList(parsed.data.tags);
	}
	if (typeof parsed.data.subforumId === "string" && (isOwner || isModerator)) {
		patch.subforum_id = parsed.data.subforumId;
	}

	if (Object.keys(patch).length === 0) {
		return apiError("No fields to update", 400);
	}

	const { data, error } = await supabase.from("forum_threads").update(patch).eq("id", id).select("*").single();
	if (error) {
		return apiError("Could not update thread", 400, error.message);
	}

	if (typeof parsed.data.content === "string") {
		const { data: actorProfile } = await supabase
			.from("profiles")
			.select("display_name, email")
			.eq("id", session.userId)
			.maybeSingle<{ display_name: string | null; email: string | null }>();
		const actorName = actorProfile?.display_name?.trim() || actorProfile?.email || "Someone";
		await notifyMentions({
			actorId: session.userId,
			actorName,
			content: parsed.data.content,
			title: `${actorName} mentioned you in a thread`,
			linkPath: `/forum/${id}`,
			metadata: { thread_id: id, updated: true },
		});
	}

	revalidatePublicCache([CACHE_TAGS.FORUM, CACHE_TAGS.LANDING]);

	return apiOk({ thread: data });
}
