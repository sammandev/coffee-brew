import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface RateLimitAuditEvent {
	source: "edge" | "db";
	endpoint: string;
	method: string;
	keyScope: string;
	retryAfterSeconds: number;
	identifier?: string;
	actorId?: string | null;
}

function toStructuredPayload(event: RateLimitAuditEvent) {
	return {
		event: "rate_limit_hit",
		source: event.source,
		endpoint: event.endpoint,
		method: event.method,
		key_scope: event.keyScope,
		retry_after_seconds: event.retryAfterSeconds,
		identifier: event.identifier ?? null,
		timestamp: new Date().toISOString(),
	};
}

export function emitRateLimitConsoleLog(event: RateLimitAuditEvent) {
	const payload = toStructuredPayload(event);
	console.warn("[rate-limit]", JSON.stringify(payload));
}

export async function persistRateLimitAuditLog(event: RateLimitAuditEvent) {
	emitRateLimitConsoleLog(event);

	try {
		const supabase = createSupabaseAdminClient();
		await supabase.from("audit_logs").insert({
			actor_id: event.actorId ?? null,
			action: "rate_limit.hit",
			target_type: "endpoint",
			target_id: null,
			metadata: toStructuredPayload(event),
		});
	} catch (error) {
		console.warn(
			"[rate-limit]",
			JSON.stringify({
				event: "rate_limit_audit_write_failed",
				endpoint: event.endpoint,
				method: event.method,
				message: error instanceof Error ? error.message : "unknown error",
				timestamp: new Date().toISOString(),
			}),
		);
	}
}
