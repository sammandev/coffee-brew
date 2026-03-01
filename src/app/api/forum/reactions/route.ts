import { apiError, apiOk } from "@/lib/api";
import type { ForumReactionType } from "@/lib/constants";
import { applyForumReputation } from "@/lib/forum-reputation";
import { requirePermission } from "@/lib/guards";
import { createNotifications } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumReactionSchema } from "@/lib/validators";

function reactionScore(reaction: ForumReactionType | null) {
	if (!reaction) return 0;
	return reaction === "dislike" ? -1 : 1;
}

export async function POST(request: Request) {
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const body = await request.json();
	const parsed = forumReactionSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid reaction payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data: actorProfile } = await supabase
		.from("profiles")
		.select("display_name, email")
		.eq("id", permission.context.userId)
		.maybeSingle<{ display_name: string | null; email: string | null }>();
	const actorName = actorProfile?.display_name?.trim() || actorProfile?.email || "Someone";
	let targetOwnerId = "";
	let threadId = "";
	let commentId: string | null = null;
	let threadTitle: string | null = null;
	let sourceType: "thread" | "comment" = "thread";
	let sourceId = "";

	if (parsed.data.targetType === "comment") {
		const { data: comment, error: commentError } = await supabase
			.from("forum_comments")
			.select("id, thread_id, author_id")
			.eq("id", parsed.data.targetId)
			.eq("status", "visible")
			.maybeSingle();
		if (commentError) return apiError("Could not resolve comment target", 400, commentError.message);
		if (!comment) return apiError("Comment not found", 404);

		const { data: thread, error: threadError } = await supabase
			.from("forum_threads")
			.select("id, title")
			.eq("id", comment.thread_id)
			.eq("status", "visible")
			.maybeSingle();
		if (threadError) return apiError("Could not resolve thread target", 400, threadError.message);
		if (!thread) return apiError("Thread not found", 404);

		targetOwnerId = comment.author_id;
		threadId = comment.thread_id;
		commentId = comment.id;
		threadTitle = thread.title;
		sourceType = "comment";
		sourceId = comment.id;
	} else {
		const { data: thread, error: threadError } = await supabase
			.from("forum_threads")
			.select("id, title, author_id")
			.eq("id", parsed.data.targetId)
			.eq("status", "visible")
			.maybeSingle();
		if (threadError) return apiError("Could not resolve thread target", 400, threadError.message);
		if (!thread) return apiError("Thread not found", 404);

		targetOwnerId = thread.author_id;
		threadId = thread.id;
		threadTitle = thread.title;
		sourceType = "thread";
		sourceId = thread.id;
	}

	const { data: existingReaction, error: existingReactionError } = await supabase
		.from("forum_reactions")
		.select("id, reaction")
		.eq("user_id", permission.context.userId)
		.eq("target_type", parsed.data.targetType)
		.eq("target_id", parsed.data.targetId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle<{ id: string; reaction: ForumReactionType }>();

	if (existingReactionError) {
		return apiError("Could not resolve existing reaction", 400, existingReactionError.message);
	}

	const previousReaction = existingReaction?.reaction ?? null;
	let nextReaction: ForumReactionType | null = parsed.data.reaction;

	if (existingReaction && existingReaction.reaction === parsed.data.reaction) {
		const { error: deleteError } = await supabase.from("forum_reactions").delete().eq("id", existingReaction.id);
		if (deleteError) return apiError("Could not remove reaction", 400, deleteError.message);
		nextReaction = null;
	} else if (existingReaction) {
		const { error: updateError } = await supabase
			.from("forum_reactions")
			.update({ reaction: parsed.data.reaction })
			.eq("id", existingReaction.id);
		if (updateError) return apiError("Could not update reaction", 400, updateError.message);
	} else {
		const { error: insertError } = await supabase.from("forum_reactions").insert({
			thread_id: threadId,
			comment_id: commentId,
			target_type: parsed.data.targetType,
			target_id: parsed.data.targetId,
			reaction: parsed.data.reaction,
			user_id: permission.context.userId,
		});
		if (insertError) return apiError("Could not add reaction", 400, insertError.message);
	}

	if (targetOwnerId !== permission.context.userId) {
		const delta = reactionScore(nextReaction) - reactionScore(previousReaction);
		await applyForumReputation({
			userId: targetOwnerId,
			actorId: permission.context.userId,
			eventType: "reaction_received",
			pointsDelta: delta,
			sourceType,
			sourceId,
			metadata: {
				previous_reaction: previousReaction,
				next_reaction: nextReaction,
			},
		});

		if (nextReaction) {
			await createNotifications([
				{
					recipientId: targetOwnerId,
					actorId: permission.context.userId,
					eventType: "reaction",
					title: commentId ? `${actorName} reacted to your comment` : `${actorName} reacted to your thread`,
					body: threadTitle
						? `A ${nextReaction} reaction was added in "${threadTitle}".`
						: `A ${nextReaction} reaction was added to your content.`,
					linkPath: commentId ? `/forum/${threadId}#comment-${commentId}` : `/forum/${threadId}`,
					metadata: {
						thread_id: threadId,
						comment_id: commentId,
						previous_reaction: previousReaction,
						next_reaction: nextReaction,
					},
				},
			]);
		}
	}

	return apiOk({
		success: true,
		reaction: nextReaction,
		removed: nextReaction === null,
	});
}
