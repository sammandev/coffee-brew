import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext, type SessionContext } from "@/lib/auth";
import type { ForumReactionType } from "@/lib/constants";
import { applyForumReputation } from "@/lib/forum-reputation";
import { createNotifications } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { blogReactionSchema } from "@/lib/validators";

function reactionScore(reaction: ForumReactionType | null) {
	if (!reaction) return 0;
	return reaction === "dislike" ? -1 : 1;
}

export async function POST(request: Request) {
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

	const body = await request.json().catch(() => null);
	const parsed = blogReactionSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid reaction payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data: post, error: postError } = await supabase
		.from("blog_posts")
		.select("id, slug, author_id, status, title_en, title_id")
		.eq("id", parsed.data.postId)
		.eq("status", "published")
		.maybeSingle();

	if (postError) return apiError("Could not resolve blog post", 400, postError.message);
	if (!post) return apiError("Blog post not found", 404);

	const { data: existingReaction, error: existingReactionError } = await supabase
		.from("blog_reactions")
		.select("id, reaction")
		.eq("post_id", post.id)
		.eq("user_id", session.userId)
		.maybeSingle<{ id: string; reaction: ForumReactionType }>();
	if (existingReactionError) {
		return apiError("Could not resolve existing reaction", 400, existingReactionError.message);
	}

	const previousReaction = existingReaction?.reaction ?? null;
	let nextReaction: ForumReactionType | null = parsed.data.reaction;

	if (existingReaction && existingReaction.reaction === parsed.data.reaction) {
		const { error: deleteError } = await supabase.from("blog_reactions").delete().eq("id", existingReaction.id);
		if (deleteError) return apiError("Could not remove reaction", 400, deleteError.message);
		nextReaction = null;
	} else if (existingReaction) {
		const { error: updateError } = await supabase
			.from("blog_reactions")
			.update({ reaction: parsed.data.reaction })
			.eq("id", existingReaction.id);
		if (updateError) return apiError("Could not update reaction", 400, updateError.message);
	} else {
		const { error: insertError } = await supabase.from("blog_reactions").insert({
			post_id: post.id,
			user_id: session.userId,
			reaction: parsed.data.reaction,
		});
		if (insertError) return apiError("Could not add reaction", 400, insertError.message);
	}

	if (post.author_id && post.author_id !== session.userId) {
		const delta = reactionScore(nextReaction) - reactionScore(previousReaction);
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
				previous_reaction: previousReaction,
				next_reaction: nextReaction,
			},
		});

		if (nextReaction) {
			const { data: actorProfile } = await supabase
				.from("profiles")
				.select("display_name, email")
				.eq("id", session.userId)
				.maybeSingle<{ display_name: string | null; email: string | null }>();
			const actorName = actorProfile?.display_name?.trim() || actorProfile?.email || "Someone";
			await createNotifications([
				{
					recipientId: post.author_id,
					actorId: session.userId,
					eventType: "reaction",
					title: `${actorName} reacted to your blog post`,
					body: `A ${nextReaction} reaction was added to "${post.title_en}".`,
					linkPath: `/blog/${post.slug}`,
					metadata: {
						post_id: post.id,
						slug: post.slug,
						previous_reaction: previousReaction,
						next_reaction: nextReaction,
					},
				},
			]);
		}
	}

	return apiOk({
		success: true,
		postId: post.id,
		reaction: nextReaction,
		removed: nextReaction === null,
	});
}
