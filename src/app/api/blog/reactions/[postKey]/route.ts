import { apiError, apiOk } from "@/lib/api";
import { getSessionContext, requireSessionContext, type SessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { applyForumReputation } from "@/lib/forum-reputation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isLikelyUuid(value: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function reactionScore(reaction: ForumReactionType | null) {
	if (!reaction) return 0;
	return reaction === "dislike" ? -1 : 1;
}

async function resolvePublishedPostByKey(postKey: string) {
	const supabase = await createSupabaseServerClient();
	const bySlug = await supabase
		.from("blog_posts")
		.select("id, slug, author_id, status")
		.eq("slug", postKey)
		.eq("status", "published")
		.maybeSingle();

	if (bySlug.data) {
		return { supabase, post: bySlug.data };
	}

	if (!isLikelyUuid(postKey)) {
		return { supabase, post: null };
	}

	const byId = await supabase
		.from("blog_posts")
		.select("id, slug, author_id, status")
		.eq("id", postKey)
		.eq("status", "published")
		.maybeSingle();

	return { supabase, post: byId.data ?? null };
}

export async function GET(_: Request, { params }: { params: Promise<{ postKey: string }> }) {
	const { postKey } = await params;
	const { supabase, post } = await resolvePublishedPostByKey(postKey);
	if (!post) return apiError("Blog post not found", 404);

	const [reactionRowsResult, session] = await Promise.all([
		supabase.from("blog_reactions").select("reaction").eq("post_id", post.id),
		getSessionContext(),
	]);

	if (reactionRowsResult.error) {
		return apiError("Could not load blog reactions", 400, reactionRowsResult.error.message);
	}

	const counts = Object.fromEntries(FORUM_REACTION_TYPES.map((reactionType) => [reactionType, 0])) as Record<
		ForumReactionType,
		number
	>;
	for (const row of reactionRowsResult.data ?? []) {
		if (!FORUM_REACTION_TYPES.includes(row.reaction as ForumReactionType)) continue;
		const reactionType = row.reaction as ForumReactionType;
		counts[reactionType] = (counts[reactionType] ?? 0) + 1;
	}

	let myReaction: ForumReactionType | null = null;
	if (session) {
		const { data: mine } = await supabase
			.from("blog_reactions")
			.select("reaction")
			.eq("post_id", post.id)
			.eq("user_id", session.userId)
			.maybeSingle();
		if (mine && FORUM_REACTION_TYPES.includes(mine.reaction as ForumReactionType)) {
			myReaction = mine.reaction as ForumReactionType;
		}
	}

	return apiOk({
		postId: post.id,
		slug: post.slug,
		reactionCounts: counts,
		myReaction,
		canReact: Boolean(session),
	});
}

export async function DELETE(_: Request, { params }: { params: Promise<{ postKey: string }> }) {
	let session: SessionContext;
	try {
		session = await requireSessionContext();
	} catch (error) {
		if (error instanceof Error && error.message === "UNAUTHORIZED") {
			return apiError("Unauthorized", 401);
		}
		if (error instanceof Error && error.message === "ACCOUNT_DISABLED") {
			return apiError("Account blocked or disabled", 403);
		}
		return apiError("Unexpected auth error", 500);
	}

	const { postKey } = await params;
	const { supabase, post } = await resolvePublishedPostByKey(postKey);
	if (!post) return apiError("Blog post not found", 404);

	const { data: existingReaction, error: existingReactionError } = await supabase
		.from("blog_reactions")
		.select("id, reaction")
		.eq("post_id", post.id)
		.eq("user_id", session.userId)
		.maybeSingle<{ id: string; reaction: ForumReactionType }>();

	if (existingReactionError) {
		return apiError("Could not resolve reaction", 400, existingReactionError.message);
	}

	if (!existingReaction) {
		return apiOk({ success: true, removed: false });
	}

	const { error: deleteError } = await supabase.from("blog_reactions").delete().eq("id", existingReaction.id);
	if (deleteError) {
		return apiError("Could not remove reaction", 400, deleteError.message);
	}

	if (post.author_id && post.author_id !== session.userId) {
		const delta = reactionScore(null) - reactionScore(existingReaction.reaction);
		await applyForumReputation({
			userId: post.author_id,
			actorId: session.userId,
			eventType: "reaction_received",
			pointsDelta: delta,
			sourceType: "blog_post",
			sourceId: post.id,
			metadata: {
				target: "blog_post",
				post_id: post.id,
				slug: post.slug,
				previous_reaction: existingReaction.reaction,
				next_reaction: null,
			},
		});
	}

	return apiOk({ success: true, removed: true });
}
