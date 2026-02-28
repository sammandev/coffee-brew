import { apiError, apiOk } from "@/lib/api";
import { canEditDmMessage, DM_MEDIA_BUCKET, normalizeDmBodyText, sanitizeDmBody } from "@/lib/direct-messages";
import { refreshConversationLatestMessage, requireActiveDmSession } from "@/lib/dm-service";
import { sanitizeForRender, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dmMessageUpdateSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { id } = await params;

	const body = await request.json().catch(() => null);
	const parsed = dmMessageUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const { data: message } = await supabase
		.from("dm_messages")
		.select("id, conversation_id, sender_id, created_at")
		.eq("id", id)
		.maybeSingle<{ id: string; conversation_id: string; sender_id: string; created_at: string }>();
	if (!message) {
		return apiError("Message not found", 404);
	}
	if (message.sender_id !== context.userId) {
		return apiError("Forbidden", 403);
	}
	if (!canEditDmMessage(message.created_at)) {
		return apiError("Could not edit message", 403, "Edit window has expired.");
	}

	const sanitizedHtml = sanitizeDmBody(parsed.data.body_html);
	if (!validatePlainTextLength(sanitizedHtml, { min: 1, max: 12000 })) {
		return apiError("Invalid payload", 400, "Message must be between 1 and 12000 plain-text characters.");
	}

	const { data: updatedMessage, error } = await supabase
		.from("dm_messages")
		.update({
			body_html: sanitizedHtml,
			body_text: normalizeDmBodyText(sanitizedHtml),
			edited_at: new Date().toISOString(),
		})
		.eq("id", id)
		.eq("sender_id", context.userId)
		.select("id, conversation_id, sender_id, body_html, body_text, edited_at, created_at")
		.single();
	if (error || !updatedMessage) {
		return apiError("Could not edit message", 400, error?.message);
	}

	return apiOk({
		message: {
			...updatedMessage,
			body_html: sanitizeForRender(updatedMessage.body_html),
		},
	});
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { id } = await params;

	const { data: message } = await supabase
		.from("dm_messages")
		.select("id, conversation_id, sender_id")
		.eq("id", id)
		.maybeSingle<{ id: string; conversation_id: string; sender_id: string }>();
	if (!message) {
		return apiError("Message not found", 404);
	}
	if (message.sender_id !== context.userId) {
		return apiError("Forbidden", 403);
	}

	const { count: linkedReports } = await supabase
		.from("dm_reports")
		.select("id", { count: "exact", head: true })
		.eq("message_id", id)
		.in("status", ["open", "resolved"]);
	if ((linkedReports ?? 0) > 0) {
		return apiError("Could not delete message", 409, "Reported messages cannot be deleted.");
	}

	const { data: attachments } = await supabase
		.from("dm_message_attachments")
		.select("storage_path, bucket")
		.eq("message_id", id);

	const { error: deleteError } = await supabase
		.from("dm_messages")
		.delete()
		.eq("id", id)
		.eq("sender_id", context.userId);
	if (deleteError) {
		return apiError("Could not delete message", 400, deleteError.message);
	}

	const storagePaths = (attachments ?? [])
		.filter((attachment) => attachment.bucket === DM_MEDIA_BUCKET)
		.map((attachment) => attachment.storage_path)
		.filter((path) => typeof path === "string" && !path.startsWith("external-"));

	if (storagePaths.length > 0) {
		await createSupabaseAdminClient().storage.from(DM_MEDIA_BUCKET).remove(storagePaths);
	}

	await refreshConversationLatestMessage(supabase, message.conversation_id);

	return apiOk({ success: true });
}
