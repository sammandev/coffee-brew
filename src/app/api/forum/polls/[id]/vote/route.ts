import { apiError, apiOk } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requirePermission } from "@/lib/guards";
import { createNotifications } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumPollVoteSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = forumPollVoteSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid vote payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const [{ data: poll }, { data: existingVote }] = await Promise.all([
		supabase.from("forum_polls").select("id, thread_id, closes_at, created_by, options").eq("id", id).maybeSingle(),
		supabase
			.from("forum_poll_votes")
			.select("id")
			.eq("poll_id", id)
			.eq("user_id", permission.context.userId)
			.maybeSingle(),
	]);

	if (!poll) {
		return apiError("Poll not found", 404);
	}
	if (existingVote) {
		return apiError("Vote already submitted", 400, "Vote changes are not allowed.");
	}
	if (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now()) {
		return apiError("Poll is closed", 400);
	}

	const options = Array.isArray(poll.options) ? poll.options : [];
	if (parsed.data.optionIndex < 0 || parsed.data.optionIndex >= options.length) {
		return apiError("Invalid vote option", 400);
	}

	const { data, error } = await supabase
		.from("forum_poll_votes")
		.insert({
			poll_id: id,
			user_id: permission.context.userId,
			option_index: parsed.data.optionIndex,
		})
		.select("id, option_index, created_at")
		.single();

	if (error) {
		return apiError("Could not submit poll vote", 400, error.message);
	}

	const { data: actorProfile } = await supabase
		.from("profiles")
		.select("display_name, email")
		.eq("id", permission.context.userId)
		.maybeSingle<{ display_name: string | null; email: string | null }>();
	const actorName = actorProfile?.display_name?.trim() || actorProfile?.email || "Someone";

	if (poll.created_by !== permission.context.userId) {
		await createNotifications([
			{
				recipientId: poll.created_by,
				actorId: permission.context.userId,
				eventType: "poll_vote",
				title: `${actorName} voted in your poll`,
				body: "A new vote was submitted to your thread poll.",
				linkPath: `/forum/${poll.thread_id}`,
				metadata: {
					thread_id: poll.thread_id,
					poll_id: poll.id,
					option_index: parsed.data.optionIndex,
				},
			},
		]);
	}

	revalidatePublicCache([CACHE_TAGS.FORUM]);

	return apiOk({ vote: data }, 201);
}
