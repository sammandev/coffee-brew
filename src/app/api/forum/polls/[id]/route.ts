import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await getSessionContext();
	const supabase = await createSupabaseServerClient();

	const { data: poll, error } = await supabase
		.from("forum_polls")
		.select("id, thread_id, question, options, closes_at, created_by, created_at, updated_at")
		.eq("id", id)
		.maybeSingle();
	if (error) {
		return apiError("Could not load poll", 400, error.message);
	}
	if (!poll) {
		return apiError("Poll not found", 404);
	}

	const [{ data: votes }, myVoteResult] = await Promise.all([
		supabase.from("forum_poll_votes").select("option_index").eq("poll_id", id),
		session
			? supabase
					.from("forum_poll_votes")
					.select("option_index")
					.eq("poll_id", id)
					.eq("user_id", session.userId)
					.maybeSingle()
			: Promise.resolve({ data: null }),
	]);

	const options = Array.isArray(poll.options) ? (poll.options as string[]) : [];
	const counts = options.map((_, index) => (votes ?? []).filter((vote) => vote.option_index === index).length);
	const totalVotes = counts.reduce((sum, value) => sum + value, 0);

	return apiOk({
		poll,
		results: counts.map((count, index) => ({
			option: options[index] ?? "",
			count,
			percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0,
		})),
		totalVotes,
		myVote: myVoteResult.data?.option_index ?? null,
	});
}
