import { apiError } from "@/lib/api";
import { logAuditEvent, logTransactionalEmailEvent } from "@/lib/audit";
import { requireSessionContext } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { assertPermission } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireManageUsersPermission() {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return { response: apiError("Unauthorized", 401) };
	}

	try {
		await assertPermission(session.role, "users", "manage_users");
	} catch {
		return { response: apiError("Forbidden", 403) };
	}

	return { session };
}

export async function updateUserStatus(params: {
	actorId: string;
	targetUserId: string;
	status: "blocked" | "disabled";
	reason?: string;
}) {
	const supabase = await createSupabaseServerClient();

	const { data: targetProfile, error } = await supabase
		.from("profiles")
		.update({ status: params.status })
		.eq("id", params.targetUserId)
		.select("id, email")
		.single();

	if (error) {
		return { ok: false, error: error.message };
	}

	try {
		await logAuditEvent({
			actorId: params.actorId,
			action: `users.${params.status}`,
			targetType: "user",
			targetId: params.targetUserId,
			metadata: { reason: params.reason },
		});
	} catch {
		// Keep status update successful even if audit logging fails.
	}

	if (targetProfile.email) {
		await sendStatusEmail(targetProfile.email, params.status, params.reason).catch(() => null);
	}

	return { ok: true };
}

export async function deleteUserLifecycle(params: { actorId: string; targetUserId: string; reason?: string }) {
	const supabase = await createSupabaseServerClient();

	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.select("id, email, display_name, status")
		.eq("id", params.targetUserId)
		.maybeSingle();

	if (profileError) {
		return { ok: false, error: profileError.message };
	}

	if (!profile) {
		return { ok: false, error: "User not found" };
	}

	const { error: archiveError } = await supabase.from("deleted_users_archive").insert({
		user_id: profile.id,
		email: profile.email,
		display_name: profile.display_name,
		previous_status: profile.status,
		deleted_by: params.actorId,
		reason: params.reason ?? null,
	});

	if (archiveError) {
		return { ok: false, error: archiveError.message };
	}

	const { error: roleDeleteError } = await supabase.from("user_roles").delete().eq("user_id", params.targetUserId);
	if (roleDeleteError) {
		return { ok: false, error: roleDeleteError.message };
	}

	const { error: profileDeleteError } = await supabase.from("profiles").delete().eq("id", params.targetUserId);
	if (profileDeleteError) {
		return { ok: false, error: profileDeleteError.message };
	}

	try {
		await logAuditEvent({
			actorId: params.actorId,
			action: "users.delete",
			targetType: "user",
			targetId: params.targetUserId,
			metadata: { reason: params.reason },
		});
	} catch {
		// Keep lifecycle action successful even if audit logging fails.
	}

	await sendStatusEmail(profile.email, "deleted", params.reason).catch(() => null);

	return { ok: true };
}

async function sendStatusEmail(to: string, status: "blocked" | "disabled" | "deleted", reason?: string) {
	const response = await sendTransactionalEmail({
		to,
		eventType: "account_status",
		subject: `Your Coffee Brew account status changed (${status})`,
		html: `<p>Your account status is now <strong>${status}</strong>.</p><p>${reason ?? "No reason provided."}</p>`,
	}).catch(() => ({
		delivered: false,
		providerId: null,
		reason: "Transactional provider error",
	}));

	await logTransactionalEmailEvent({
		toEmail: to,
		eventType: "account_status",
		payload: { status, reason },
		providerMessageId: response.providerId,
		status: response.delivered ? "sent" : "failed",
		failureReason: response.reason,
	}).catch(() => null);
}
