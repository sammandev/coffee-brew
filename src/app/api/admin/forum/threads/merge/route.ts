import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mergeSchema = z.object({
	sourceThreadId: z.string().uuid(),
	targetThreadId: z.string().uuid(),
});

export async function POST(request: Request) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}
	if (session.role !== "superuser") {
		return apiError("Forbidden", 403);
	}

	const body = await request.json().catch(() => null);
	const parsed = mergeSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid merge payload", 400, parsed.error.message);
	}
	if (parsed.data.sourceThreadId === parsed.data.targetThreadId) {
		return apiError("Invalid merge payload", 400, "Source and target threads must be different.");
	}

	const supabase = createSupabaseAdminClient();
	const [{ data: sourceThread }, { data: targetThread }] = await Promise.all([
		supabase.from("forum_threads").select("id").eq("id", parsed.data.sourceThreadId).maybeSingle(),
		supabase.from("forum_threads").select("id").eq("id", parsed.data.targetThreadId).maybeSingle(),
	]);
	if (!sourceThread || !targetThread) {
		return apiError("Thread not found", 404);
	}

	const [{ error: commentsError }, { error: reactionsError }, { data: sourcePoll }, { data: targetPoll }] =
		await Promise.all([
			supabase
				.from("forum_comments")
				.update({ thread_id: parsed.data.targetThreadId })
				.eq("thread_id", parsed.data.sourceThreadId),
			supabase
				.from("forum_reactions")
				.update({
					thread_id: parsed.data.targetThreadId,
					target_id: parsed.data.targetThreadId,
				})
				.eq("target_type", "thread")
				.eq("target_id", parsed.data.sourceThreadId),
			supabase.from("forum_polls").select("id").eq("thread_id", parsed.data.sourceThreadId).maybeSingle(),
			supabase.from("forum_polls").select("id").eq("thread_id", parsed.data.targetThreadId).maybeSingle(),
		]);

	if (commentsError || reactionsError) {
		return apiError("Could not merge thread content", 400, commentsError?.message || reactionsError?.message);
	}

	if (sourcePoll && !targetPoll) {
		await supabase.from("forum_polls").update({ thread_id: parsed.data.targetThreadId }).eq("id", sourcePoll.id);
	}
	if (sourcePoll && targetPoll) {
		await supabase.from("forum_polls").delete().eq("id", sourcePoll.id);
	}

	const { error: deleteError } = await supabase.from("forum_threads").delete().eq("id", parsed.data.sourceThreadId);
	if (deleteError) {
		return apiError("Could not finalize thread merge", 400, deleteError.message);
	}

	return apiOk({
		success: true,
		targetThreadId: parsed.data.targetThreadId,
		sourceThreadId: parsed.data.sourceThreadId,
	});
}
