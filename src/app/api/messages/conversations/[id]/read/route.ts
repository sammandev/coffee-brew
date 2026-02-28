import { apiError, apiOk } from "@/lib/api";
import { isConversationParticipant, requireActiveDmSession } from "@/lib/dm-service";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { id } = await params;

	const isParticipant = await isConversationParticipant(supabase, id, context.userId);
	if (!isParticipant) {
		return apiError("Conversation not found", 404);
	}

	const now = new Date().toISOString();
	const { error } = await supabase
		.from("dm_participants")
		.update({
			last_read_at: now,
			last_seen_at: now,
		})
		.eq("conversation_id", id)
		.eq("user_id", context.userId);

	if (error) {
		return apiError("Could not update read status", 400, error.message);
	}

	return apiOk({
		conversation_id: id,
		last_read_at: now,
	});
}
