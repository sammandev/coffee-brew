import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email/resend";

const { mockSend, mockServerEnv } = vi.hoisted(() => ({
	mockSend: vi.fn(),
	mockServerEnv: {
		RESEND_API_KEY: undefined as string | undefined,
		RESEND_FROM_EMAIL: undefined as string | undefined,
	},
}));

vi.mock("resend", () => ({
	Resend: class {
		emails = {
			send: mockSend,
		};
	},
}));

vi.mock("@/lib/config/server", () => ({
	serverEnv: mockServerEnv,
}));

describe("sendTransactionalEmail", () => {
	beforeEach(() => {
		mockSend.mockReset();
		mockServerEnv.RESEND_API_KEY = undefined;
		mockServerEnv.RESEND_FROM_EMAIL = undefined;
	});

	it("returns failed result when Resend env vars are missing", async () => {
		const result = await sendTransactionalEmail({
			to: "user@example.com",
			subject: "Coffee Brew",
			html: "<p>Hello</p>",
			eventType: "account_status",
		});

		expect(result).toEqual({
			delivered: false,
			providerId: null,
			reason: "Resend env vars missing",
		});
	});

	it("maps provider error into a failed delivery result", async () => {
		mockServerEnv.RESEND_API_KEY = "re_test";
		mockServerEnv.RESEND_FROM_EMAIL = "noreply@example.com";
		mockSend.mockResolvedValue({
			data: null,
			error: {
				message: "Resend unavailable",
			},
		});

		const result = await sendTransactionalEmail({
			to: "user@example.com",
			subject: "Coffee Brew",
			html: "<p>Hello</p>",
			eventType: "account_status",
		});

		expect(result).toEqual({
			delivered: false,
			providerId: null,
			reason: "Resend unavailable",
		});
	});

	it("returns provider id when email send succeeds", async () => {
		mockServerEnv.RESEND_API_KEY = "re_test";
		mockServerEnv.RESEND_FROM_EMAIL = "noreply@example.com";
		mockSend.mockResolvedValue({
			data: {
				id: "email_123",
			},
			error: null,
		});

		const result = await sendTransactionalEmail({
			to: "user@example.com",
			subject: "Coffee Brew",
			html: "<p>Hello</p>",
			eventType: "account_status",
		});

		expect(result).toEqual({
			delivered: true,
			providerId: "email_123",
			reason: null,
		});
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "noreply@example.com",
				to: "user@example.com",
			}),
		);
	});
});
