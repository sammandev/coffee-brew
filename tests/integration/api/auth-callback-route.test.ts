import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/callback/route";
import { AUTH_CALLBACK_NONCE_COOKIE } from "@/lib/auth-callback";

const mockCookieStore = {
	get: vi.fn(),
	set: vi.fn(),
	getAll: vi.fn(() => []),
};

vi.mock("next/headers", () => ({
	cookies: vi.fn(async () => mockCookieStore),
}));

describe("GET /api/auth/callback", () => {
	beforeEach(() => {
		mockCookieStore.get.mockReset();
		mockCookieStore.set.mockReset();
		mockCookieStore.getAll.mockClear();
	});

	it("rejects callback nonce mismatches", async () => {
		mockCookieStore.get.mockReturnValue({ value: "expected-nonce" });

		const response = await GET(
			new Request("http://localhost/api/auth/callback?code=abc123&cb_nonce=wrong-nonce&next=%2Fsession%2Fresolve"),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("http://localhost/login?error=auth_callback_nonce_invalid");
		expect(mockCookieStore.get).toHaveBeenCalledWith(AUTH_CALLBACK_NONCE_COOKIE);
		expect(mockCookieStore.set).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AUTH_CALLBACK_NONCE_COOKIE,
				maxAge: 0,
			}),
		);
	});
});
