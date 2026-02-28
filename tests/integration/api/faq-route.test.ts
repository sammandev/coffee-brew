import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/faq/route";

const mockGetVisibleFaqItems = vi.fn();

vi.mock("@/lib/queries", () => ({
	getVisibleFaqItems: () => mockGetVisibleFaqItems(),
}));

describe("GET /api/faq", () => {
	beforeEach(() => {
		mockGetVisibleFaqItems.mockReset();
	});

	it("returns visible FAQ items", async () => {
		mockGetVisibleFaqItems.mockResolvedValue([
			{
				id: "faq-1",
				question_en: "What brew ratio should I start with?",
				answer_en: "Start around 1:15 and adjust by taste.",
				question_id: "Rasio seduh awal yang bagus?",
				answer_id: "Mulai dari 1:15 lalu sesuaikan dengan rasa.",
				order_index: 0,
				is_visible: true,
				created_at: "2026-01-01T00:00:00.000Z",
				updated_at: "2026-01-01T00:00:00.000Z",
			},
		]);

		const response = await GET();
		const body = (await response.json()) as { items: Array<{ id: string }> };

		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0]?.id).toBe("faq-1");
	});
});
