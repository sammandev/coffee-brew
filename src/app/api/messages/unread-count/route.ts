import { apiError, apiOk } from "@/lib/api";
import { requireActiveDmSession } from "@/lib/dm-service";

export async function GET() {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;

	const { data: participantRows, error: participantError } = await supabase
		.from("dm_participants")
		.select("conversation_id, last_read_at, archived_at")
		.eq("user_id", context.userId)
		.is("archived_at", null);
	if (participantError) {
		return apiError("Could not fetch unread count", 400, participantError.message);
	}

	const rows = participantRows ?? [];
	if (rows.length === 0) {
		return apiOk({ unread_count: 0 });
	}

	let unreadCount = 0;
	for (const row of rows) {
		const query = supabase
			.from("dm_messages")
			.select("id", { count: "exact", head: true })
			.eq("conversation_id", row.conversation_id)
			.neq("sender_id", context.userId);
		const scopedQuery = row.last_read_at ? query.gt("created_at", row.last_read_at) : query;
		const { count } = await scopedQuery;
		unreadCount += count ?? 0;
	}

	return apiOk({ unread_count: unreadCount });
}
