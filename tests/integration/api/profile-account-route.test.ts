import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/profile/account/route";

const mockGetSessionContext = vi.fn();
const mockHardDeleteUserAccount = vi.fn();
const mockGetUser = vi.fn();
const mockConsumeDbRateLimit = vi.fn();
const mockPersistRateLimitAuditLog = vi.fn();

vi.mock("@/lib/auth", () => ({
	getSessionContext: () => mockGetSessionContext(),
}));

vi.mock("@/lib/user-lifecycle", () => ({
	hardDeleteUserAccount: (input: unknown) => mockHardDeleteUserAccount(input),
}));

vi.mock("@/lib/rate-limit", () => ({
	consumeDbRateLimit: (input: unknown) => mockConsumeDbRateLimit(input),
}));

vi.mock("@/lib/rate-limit-audit", () => ({
	persistRateLimitAuditLog: (input: unknown) => mockPersistRateLimitAuditLog(input),
}));

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: () => ({
		auth: {
			getUser: () => mockGetUser(),
		},
	}),
}));

function createDeleteRequest(payload: Record<string, unknown>) {
	return new Request("http://localhost/api/profile/account", {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
}

describe("DELETE /api/profile/account", () => {
	beforeEach(() => {
		mockGetSessionContext.mockReset();
		mockHardDeleteUserAccount.mockReset();
		mockGetUser.mockReset();
		mockConsumeDbRateLimit.mockReset();
		mockPersistRateLimitAuditLog.mockReset();
		mockConsumeDbRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
		mockPersistRateLimitAuditLog.mockResolvedValue(undefined);

		mockGetSessionContext.mockResolvedValue({
			userId: "user-1",
			email: "user@example.com",
			role: "user",
			status: "active",
		});
	});

	it("rejects account deletion when recent sign-in window is exceeded", async () => {
		mockGetUser.mockResolvedValue({
			data: {
				user: {
					id: "user-1",
					last_sign_in_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
				},
			},
		});

		const response = await DELETE(
			createDeleteRequest({
				confirmEmail: "user@example.com",
			}),
		);
		const body = (await response.json()) as { error?: string };

		expect(response.status).toBe(403);
		expect(body.error).toBe("Recent sign-in required before deleting account");
		expect(mockHardDeleteUserAccount).not.toHaveBeenCalled();
	});

	it("allows account deletion when user signed in recently", async () => {
		mockGetUser.mockResolvedValue({
			data: {
				user: {
					id: "user-1",
					last_sign_in_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
				},
			},
		});
		mockHardDeleteUserAccount.mockResolvedValue({ ok: true });

		const response = await DELETE(
			createDeleteRequest({
				confirmEmail: "user@example.com",
				reason: "cleanup",
			}),
		);
		const body = (await response.json()) as { success?: boolean };

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(mockHardDeleteUserAccount).toHaveBeenCalledWith({
			actorId: "user-1",
			targetUserId: "user-1",
			reason: "cleanup",
		});
	});

	it("rejects account deletion when DB rate limit is exceeded", async () => {
		mockConsumeDbRateLimit
			.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 14 })
			.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 });

		const response = await DELETE(
			createDeleteRequest({
				confirmEmail: "user@example.com",
			}),
		);
		const body = (await response.json()) as { error?: string };

		expect(response.status).toBe(429);
		expect(body.error).toBe("Rate limit exceeded");
		expect(mockHardDeleteUserAccount).not.toHaveBeenCalled();
		expect(mockPersistRateLimitAuditLog).toHaveBeenCalledTimes(1);
		expect(mockPersistRateLimitAuditLog).toHaveBeenCalledWith({
			source: "db",
			endpoint: "/api/profile/account",
			method: "DELETE",
			keyScope: "db:user",
			retryAfterSeconds: 14,
			identifier: "user-1",
			actorId: "user-1",
		});
	});

	it("writes both user and ip rate-limit audit logs when both scopes are exceeded", async () => {
		mockConsumeDbRateLimit
			.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 8 })
			.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 11 });

		const response = await DELETE(
			createDeleteRequest({
				confirmEmail: "user@example.com",
			}),
		);
		const body = (await response.json()) as { error?: string };

		expect(response.status).toBe(429);
		expect(body.error).toBe("Rate limit exceeded");
		expect(mockPersistRateLimitAuditLog).toHaveBeenCalledTimes(2);
		expect(mockPersistRateLimitAuditLog).toHaveBeenNthCalledWith(1, {
			source: "db",
			endpoint: "/api/profile/account",
			method: "DELETE",
			keyScope: "db:user",
			retryAfterSeconds: 11,
			identifier: "user-1",
			actorId: "user-1",
		});
		expect(mockPersistRateLimitAuditLog).toHaveBeenNthCalledWith(2, {
			source: "db",
			endpoint: "/api/profile/account",
			method: "DELETE",
			keyScope: "db:ip",
			retryAfterSeconds: 11,
			identifier: "unknown",
			actorId: "user-1",
		});
	});
});
