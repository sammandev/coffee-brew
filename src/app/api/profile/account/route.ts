import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { consumeDbRateLimit } from "@/lib/rate-limit";
import { persistRateLimitAuditLog } from "@/lib/rate-limit-audit";
import { getRequestIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hardDeleteUserAccount } from "@/lib/user-lifecycle";
import { profileAccountDeleteSchema } from "@/lib/validators";

const ACCOUNT_DELETE_RECENT_SIGNIN_WINDOW_MS = 15 * 60 * 1000;

export async function DELETE(request: Request) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	if (session.status !== "active") {
		return apiError("Account blocked or disabled", 403);
	}

	if (session.role === "superuser") {
		return apiError("Superuser account deletion is disabled", 403);
	}

	const requestIp = getRequestIp(request.headers);
	const [userRateLimit, ipRateLimit] = await Promise.all([
		consumeDbRateLimit({
			key: `db:profile-account-delete:user:${session.userId}`,
			limit: 3,
			windowMs: 15 * 60 * 1000,
		}),
		consumeDbRateLimit({
			key: `db:profile-account-delete:ip:${requestIp}`,
			limit: 20,
			windowMs: 15 * 60 * 1000,
		}),
	]);

	if (!userRateLimit.allowed || !ipRateLimit.allowed) {
		const retryAfterSeconds = Math.max(userRateLimit.retryAfterSeconds, ipRateLimit.retryAfterSeconds, 1);

		if (!userRateLimit.allowed) {
			await persistRateLimitAuditLog({
				source: "db",
				endpoint: "/api/profile/account",
				method: "DELETE",
				keyScope: "db:user",
				retryAfterSeconds,
				identifier: session.userId,
				actorId: session.userId,
			});
		}

		if (!ipRateLimit.allowed) {
			await persistRateLimitAuditLog({
				source: "db",
				endpoint: "/api/profile/account",
				method: "DELETE",
				keyScope: "db:ip",
				retryAfterSeconds,
				identifier: requestIp,
				actorId: session.userId,
			});
		}

		return apiError("Rate limit exceeded", 429, `Try again in ${retryAfterSeconds} seconds.`);
	}

	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return apiError("Unauthorized", 401);
	}

	if (user.id !== session.userId) {
		return apiError("Unauthorized", 401);
	}

	const lastSignInAt = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : Number.NaN;
	if (!Number.isFinite(lastSignInAt) || Date.now() - lastSignInAt > ACCOUNT_DELETE_RECENT_SIGNIN_WINDOW_MS) {
		return apiError("Recent sign-in required before deleting account", 403);
	}

	const body = await request.json().catch(() => null);
	const parsed = profileAccountDeleteSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	if (parsed.data.confirmEmail.toLowerCase() !== session.email.toLowerCase()) {
		return apiError("Email confirmation does not match", 400);
	}

	const deleted = await hardDeleteUserAccount({
		actorId: session.userId,
		targetUserId: session.userId,
		reason: parsed.data.reason,
	});

	if (!deleted.ok) {
		return apiError("Could not delete account", 400, deleted.error);
	}

	return apiOk({ success: true });
}
