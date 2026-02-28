import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
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

	// Ensure target exists before inserting reaction.
	if (parsed.data.targetType === "thread") {
		const { data } = await supabase
			.from("forum_threads")
			.select("id")
			.eq("id", parsed.data.targetId)
			.eq("status", "visible")
			.maybeSingle();
		if (!data) return apiError("Thread not found", 404);
	}

	if (parsed.data.targetType === "comment") {
		const { data } = await supabase
			.from("forum_comments")
			.select("id, thread_id")
			.eq("id", parsed.data.targetId)
			.eq("status", "visible")
			.maybeSingle();
		if (!data) return apiError("Comment not found", 404);

		const { error } = await supabase
			.from("forum_reactions")
			.upsert(
				{
					thread_id: data.thread_id,
					comment_id: data.id,
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
		return apiOk({ success: true });
	}

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

	return apiOk({ success: true });
}
