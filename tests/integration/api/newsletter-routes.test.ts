import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postSubscribe } from "@/app/api/newsletter/subscribe/route";
import { POST as postUnsubscribe } from "@/app/api/newsletter/unsubscribe/route";

const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockGetSessionContext = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
	upsert: mockUpsert,
}));

vi.mock("@/lib/newsletter", () => ({
	getNewsletterProvider: () => ({
		subscribe: mockSubscribe,
		unsubscribe: mockUnsubscribe,
	}),
}));

vi.mock("@/lib/auth", () => ({
	getSessionContext: () => mockGetSessionContext(),
}));

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: async () => ({
		from: mockFrom,
	}),
}));

function createJsonRequest(url: string, payload: Record<string, unknown>) {
	return new Request(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
}

describe("newsletter routes", () => {
	beforeEach(() => {
		mockSubscribe.mockReset();
		mockUnsubscribe.mockReset();
		mockGetSessionContext.mockReset();
		mockUpsert.mockReset();
		mockFrom.mockClear();

		mockGetSessionContext.mockResolvedValue({
			userId: "user-1",
		});
		mockUpsert.mockResolvedValue({ error: null });
	});

	it("writes synced status on newsletter subscribe success", async () => {
		mockSubscribe.mockResolvedValue({
			ok: true,
			providerId: "brevo_1",
		});

		const response = await postSubscribe(
			createJsonRequest("http://localhost/api/newsletter/subscribe", {
				email: "brew@example.com",
				consent: true,
				source: "signup",
			}),
		);
		const body = (await response.json()) as { success: boolean; subscriberId?: string };

		expect(response.status).toBe(201);
		expect(body.success).toBe(true);
		expect(body.subscriberId).toBe("brevo_1");
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "brew@example.com",
				user_id: "user-1",
				sync_status: "synced",
				provider_subscriber_id: "brevo_1",
			}),
			expect.objectContaining({
				onConflict: "email",
			}),
		);
	});

	it("writes queued status on newsletter subscribe provider failure", async () => {
		mockSubscribe.mockResolvedValue({
			ok: false,
			message: "Brevo request failed (401)",
		});

		const response = await postSubscribe(
			createJsonRequest("http://localhost/api/newsletter/subscribe", {
				email: "brew@example.com",
				consent: true,
				source: "signup",
			}),
		);
		const body = (await response.json()) as { success: boolean; queued?: boolean };

		expect(response.status).toBe(202);
		expect(body.success).toBe(false);
		expect(body.queued).toBe(true);
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "brew@example.com",
				sync_status: "queued",
			}),
			expect.objectContaining({
				onConflict: "email",
			}),
		);
	});

	it("writes synced status on newsletter unsubscribe success", async () => {
		mockUnsubscribe.mockResolvedValue({
			ok: true,
		});

		const response = await postUnsubscribe(
			createJsonRequest("http://localhost/api/newsletter/unsubscribe", {
				email: "brew@example.com",
			}),
		);
		const body = (await response.json()) as { success: boolean };

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "brew@example.com",
				consent: false,
				sync_status: "synced",
			}),
			expect.objectContaining({
				onConflict: "email",
			}),
		);
	});

	it("writes queued status on newsletter unsubscribe provider failure", async () => {
		mockUnsubscribe.mockResolvedValue({
			ok: false,
			message: "Brevo request failed (500)",
		});

		const response = await postUnsubscribe(
			createJsonRequest("http://localhost/api/newsletter/unsubscribe", {
				email: "brew@example.com",
			}),
		);
		const body = (await response.json()) as { success: boolean; queued?: boolean };

		expect(response.status).toBe(202);
		expect(body.success).toBe(false);
		expect(body.queued).toBe(true);
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "brew@example.com",
				sync_status: "queued",
			}),
			expect.objectContaining({
				onConflict: "email",
			}),
		);
	});
});
