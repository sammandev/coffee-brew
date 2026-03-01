import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/prepare-callback/route";

const mockConsumeDbRateLimit = vi.fn();
const mockPersistRateLimitAuditLog = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
	consumeDbRateLimit: (input: unknown) => mockConsumeDbRateLimit(input),
}));

vi.mock("@/lib/rate-limit-audit", () => ({
	persistRateLimitAuditLog: (input: unknown) => mockPersistRateLimitAuditLog(input),
}));

describe("POST /api/auth/prepare-callback", () => {
	beforeEach(() => {
		mockConsumeDbRateLimit.mockReset();
		mockPersistRateLimitAuditLog.mockReset();
		mockConsumeDbRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
		mockPersistRateLimitAuditLog.mockResolvedValue(undefined);
	});

	it("rejects cross-origin requests", async () => {
		const response = await POST(
			new Request("http://localhost/api/auth/prepare-callback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					origin: "https://evil.example",
				},
				body: JSON.stringify({ next: "/session/resolve" }),
			}),
		);

		expect(response.status).toBe(403);
	});

	it("normalizes unsafe next paths", async () => {
		const response = await POST(
			new Request("http://localhost/api/auth/prepare-callback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					origin: "http://localhost",
				},
				body: JSON.stringify({ next: "//evil.example/path" }),
			}),
		);
		const body = (await response.json()) as { callbackUrl: string };

		expect(response.status).toBe(200);
		expect(body.callbackUrl).toContain("next=%2Fsession%2Fresolve");
	});

	it("returns 429 when DB rate limit is exceeded", async () => {
		mockConsumeDbRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 12 });

		const response = await POST(
			new Request("http://localhost/api/auth/prepare-callback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					origin: "http://localhost",
				},
				body: JSON.stringify({ next: "/session/resolve" }),
			}),
		);
		const body = (await response.json()) as { error?: string };

		expect(response.status).toBe(429);
		expect(body.error).toBe("Rate limit exceeded");
		expect(response.headers.get("Retry-After")).toBe("12");
		expect(mockPersistRateLimitAuditLog).toHaveBeenCalledWith({
			source: "db",
			endpoint: "/api/auth/prepare-callback",
			method: "POST",
			keyScope: "db:ip",
			retryAfterSeconds: 12,
			identifier: "unknown",
		});
	});
});
