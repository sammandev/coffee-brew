import { apiError, apiOk } from "@/lib/api";
import { applyForumReputation } from "@/lib/forum-reputation";
import { requirePermission } from "@/lib/guards";
import { createNotifications } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumReactionSchema } from "@/lib/validators";

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

	if (parsed.data.targetType === "comment") {
		const { data: comment } = await supabase
			.from("forum_comments")
			.select("id, thread_id, author_id")
			.eq("id", parsed.data.targetId)
			.eq("status", "visible")
			.maybeSingle();
		if (!comment) return apiError("Comment not found", 404);

		const { data: thread } = await supabase
			.from("forum_threads")
			.select("id, title")
			.eq("id", comment.thread_id)
			.eq("status", "visible")
			.maybeSingle();

		const { error } = await supabase
			.from("forum_reactions")
			.upsert(
				{
					thread_id: comment.thread_id,
					comment_id: comment.id,
					target_type: parsed.data.targetType,
					target_id: parsed.data.targetId,
					reaction: parsed.data.reaction,
					user_id: permission.context.userId,
				},
				{ onConflict: "user_id,target_type,target_id,reaction" },
			)
			.select("id")
			.single();

		if (error) return apiError("Could not add reaction", 400, error.message);

		if (comment.author_id !== permission.context.userId) {
			await applyForumReputation({
				userId: comment.author_id,
				actorId: permission.context.userId,
				eventType: "reaction_received",
				sourceType: "comment",
				sourceId: comment.id,
				metadata: { reaction: parsed.data.reaction },
			});
			await createNotifications([
				{
					recipientId: comment.author_id,
					actorId: permission.context.userId,
					eventType: "reaction",
					title: `${actorName} reacted to your comment`,
					body: thread?.title
						? `A new reaction was added in "${thread.title}".`
						: "A new reaction was added to your comment.",
					linkPath: `/forum/${comment.thread_id}#comment-${comment.id}`,
					metadata: {
						thread_id: comment.thread_id,
						comment_id: comment.id,
						reaction: parsed.data.reaction,
					},
				},
			]);
		}

		return apiOk({ success: true });
	}

	const { data: thread } = await supabase
		.from("forum_threads")
		.select("id, title, author_id")
		.eq("id", parsed.data.targetId)
		.eq("status", "visible")
		.maybeSingle();
	if (!thread) return apiError("Thread not found", 404);

	const { error } = await supabase
		.from("forum_reactions")
		.upsert(
			{
				thread_id: parsed.data.targetId,
				target_type: parsed.data.targetType,
				target_id: parsed.data.targetId,
				reaction: parsed.data.reaction,
				user_id: permission.context.userId,
			},
			{ onConflict: "user_id,target_type,target_id,reaction" },
		)
		.select("id")
		.single();

	if (error) {
		return apiError("Could not add reaction", 400, error.message);
	}

	if (thread.author_id !== permission.context.userId) {
		await applyForumReputation({
			userId: thread.author_id,
			actorId: permission.context.userId,
			eventType: "reaction_received",
			sourceType: "thread",
			sourceId: thread.id,
			metadata: { reaction: parsed.data.reaction },
		});
		await createNotifications([
			{
				recipientId: thread.author_id,
				actorId: permission.context.userId,
				eventType: "reaction",
				title: `${actorName} reacted to your thread`,
				body: `A new reaction was added in "${thread.title}".`,
				linkPath: `/forum/${thread.id}`,
				metadata: {
					thread_id: thread.id,
					reaction: parsed.data.reaction,
				},
			},
		]);
	}

	return apiOk({ success: true });
}
