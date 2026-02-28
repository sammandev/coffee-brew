import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrevoProvider } from "@/lib/newsletter/brevo";

const { mockServerEnv } = vi.hoisted(() => ({
	mockServerEnv: {
		BREVO_API_KEY: "brevo-key" as string | undefined,
		BREVO_BASE_URL: "https://api.brevo.com/v3" as string | undefined,
		BREVO_LIST_IDS: "2,7" as string | undefined,
		BREVO_LIST_ID: undefined as string | undefined,
	},
}));

vi.mock("@/lib/config/server", () => ({
	serverEnv: mockServerEnv,
}));

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

describe("BrevoProvider", () => {
	beforeEach(() => {
		mockServerEnv.BREVO_API_KEY = "brevo-key";
		mockServerEnv.BREVO_BASE_URL = "https://api.brevo.com/v3";
		mockServerEnv.BREVO_LIST_IDS = "2,7";
		mockServerEnv.BREVO_LIST_ID = undefined;
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("subscribes contact using Brevo contacts endpoint and api-key header", async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ id: 99 }, 201));
		vi.stubGlobal("fetch", fetchMock);

		const provider = new BrevoProvider();
		const result = await provider.subscribe({
			email: "brew@example.com",
			source: "signup",
		});

		expect(result).toEqual({
			ok: true,
			providerId: "99",
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.brevo.com/v3/contacts",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"api-key": "brevo-key",
				}),
			}),
		);

		const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
		const payload = JSON.parse(String(requestInit.body));
		expect(payload.listIds).toEqual([2, 7]);
		expect(payload.attributes.SOURCE).toBe("signup");
	});

	it("falls back to update contact when create returns duplicate", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ code: "duplicate_parameter", message: "Contact already exist" }, 400))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		const provider = new BrevoProvider();
		const result = await provider.subscribe({
			email: "brew@example.com",
			source: "landing",
		});

		expect(result).toEqual({
			ok: true,
			providerId: "brew@example.com",
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.brevo.com/v3/contacts/brew%40example.com");

		const requestInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
		const payload = JSON.parse(String(requestInit.body));
		expect(payload.listIds).toEqual([2, 7]);
		expect(payload.emailBlacklisted).toBe(false);
	});

	it("unsubscribes by blacklisting contact email", async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		const provider = new BrevoProvider();
		const result = await provider.unsubscribe("brew@example.com");

		expect(result).toEqual({
			ok: true,
			providerId: "brew@example.com",
		});
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.brevo.com/v3/contacts/brew%40example.com",
			expect.objectContaining({
				method: "PUT",
			}),
		);
	});

	it("returns error when list IDs are missing", async () => {
		mockServerEnv.BREVO_LIST_IDS = undefined;
		mockServerEnv.BREVO_LIST_ID = undefined;

		const provider = new BrevoProvider();
		const result = await provider.subscribe({
			email: "brew@example.com",
			source: "signup",
		});

		expect(result.ok).toBe(false);
		expect(result.message).toContain("BREVO_LIST_IDS");
	});

	it("uses legacy BREVO_LIST_ID as fallback when BREVO_LIST_IDS is unset", async () => {
		mockServerEnv.BREVO_LIST_IDS = undefined;
		mockServerEnv.BREVO_LIST_ID = "8";

		const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ id: 55 }, 201));
		vi.stubGlobal("fetch", fetchMock);

		const provider = new BrevoProvider();
		const result = await provider.subscribe({
			email: "brew@example.com",
			source: "profile",
		});

		expect(result).toEqual({
			ok: true,
			providerId: "55",
		});

		const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
		const payload = JSON.parse(String(requestInit.body));
		expect(payload.listIds).toEqual([8]);
	});
});
