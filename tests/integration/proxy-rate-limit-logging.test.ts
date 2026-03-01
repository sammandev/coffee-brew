import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

const mockConsumeEdgeRateLimit = vi.fn();
const mockEmitRateLimitConsoleLog = vi.fn();
const mockUpdateSession = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
	consumeEdgeRateLimit: (input: unknown) => mockConsumeEdgeRateLimit(input),
}));

vi.mock("@/lib/rate-limit-audit", () => ({
	emitRateLimitConsoleLog: (input: unknown) => mockEmitRateLimitConsoleLog(input),
}));

vi.mock("@/lib/supabase/middleware", () => ({
	updateSession: (input: unknown) => mockUpdateSession(input),
}));

function createProxyRequest(options: {
	method: string;
	path: string;
	headers?: Record<string, string>;
	cookies?: Array<{ name: string; value: string }>;
}) {
	const url = new URL(`http://localhost${options.path}`);
	return {
		method: options.method,
		nextUrl: url,
		headers: new Headers(options.headers),
		cookies: {
			getAll: () => options.cookies ?? [],
		},
	} as unknown as NextRequest;
}

describe("proxy edge rate-limit audit logging", () => {
	beforeEach(() => {
		mockConsumeEdgeRateLimit.mockReset();
		mockEmitRateLimitConsoleLog.mockReset();
		mockUpdateSession.mockReset();
		mockUpdateSession.mockResolvedValue(new Response(null, { status: 200 }));
	});

	it("emits a structured source=edge audit event on edge rate-limit rejection", async () => {
		mockConsumeEdgeRateLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 9 });

		const request = createProxyRequest({
			method: "DELETE",
			path: "/api/profile/account",
			headers: {
				"x-forwarded-for": "203.0.113.1",
			},
		});

		const response = await proxy(request);
		const body = (await response.json()) as { error?: string };

		expect(response.status).toBe(429);
		expect(body.error).toBe("Rate limit exceeded");
		expect(response.headers.get("Retry-After")).toBe("9");
		expect(mockConsumeEdgeRateLimit).toHaveBeenCalledWith({
			key: "edge:/api/profile/account:DELETE:203.0.113.1",
			limit: 8,
			windowMs: 15 * 60 * 1000,
		});
		expect(mockEmitRateLimitConsoleLog).toHaveBeenCalledWith({
			source: "edge",
			endpoint: "/api/profile/account",
			method: "DELETE",
			keyScope: "edge:ip",
			retryAfterSeconds: 9,
			identifier: "203.0.113.1",
		});
		expect(mockUpdateSession).not.toHaveBeenCalled();
	});

	it("does not emit edge audit logs when edge rate-limit allows request", async () => {
		mockConsumeEdgeRateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });

		const request = createProxyRequest({
			method: "POST",
			path: "/api/auth/prepare-callback",
			headers: {
				"x-forwarded-for": "198.51.100.2",
			},
		});

		const response = await proxy(request);

		expect(response.status).toBe(200);
		expect(mockConsumeEdgeRateLimit).toHaveBeenCalledWith({
			key: "edge:/api/auth/prepare-callback:POST:198.51.100.2",
			limit: 30,
			windowMs: 60 * 1000,
		});
		expect(mockEmitRateLimitConsoleLog).not.toHaveBeenCalled();
		expect(mockUpdateSession).not.toHaveBeenCalled();
	});
});
