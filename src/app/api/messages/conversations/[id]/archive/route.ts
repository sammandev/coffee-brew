import { apiError, apiOk } from "@/lib/api";
import { isConversationParticipant, requireActiveDmSession } from "@/lib/dm-service";

interface ArchivePayload {
	archived?: boolean;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { id } = await params;

	const isParticipant = await isConversationParticipant(supabase, id, context.userId);
	if (!isParticipant) {
		return apiError("Conversation not found", 404);
	}

	const body = (await request.json().catch(() => ({}))) as ArchivePayload;
	const archived = body.archived ?? true;
	const archivedAt = archived ? new Date().toISOString() : null;

	const { error } = await supabase
		.from("dm_participants")
		.update({ archived_at: archivedAt })
		.eq("conversation_id", id)
		.eq("user_id", context.userId);

	if (error) {
		return apiError("Could not update conversation", 400, error.message);
	}

	return apiOk({
		conversation_id: id,
		archived_at: archivedAt,
	});
}
