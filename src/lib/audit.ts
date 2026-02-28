import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logAuditEvent(params: {
	actorId: string;
	action: string;
	targetType: string;
	targetId?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const supabase = await createSupabaseServerClient();

	await supabase.from("audit_logs").insert({
		actor_id: params.actorId,
		action: params.action,
		target_type: params.targetType,
		target_id: params.targetId,
		metadata: params.metadata ?? {},
	});
}

export async function logTransactionalEmailEvent(params: {
	toEmail: string;
	eventType: string;
	payload: Record<string, unknown>;
	providerMessageId?: string | null;
	status: "queued" | "sent" | "failed";
	failureReason?: string | null;
}) {
	const supabase = await createSupabaseServerClient();

	await supabase.from("transactional_email_events").insert({
		to_email: params.toEmail,
		event_type: params.eventType,
		payload: params.payload,
		provider_message_id: params.providerMessageId ?? null,
		delivery_status: params.status,
		failure_reason: params.failureReason ?? null,
	});
}
