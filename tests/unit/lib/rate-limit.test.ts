import { describe, expect, it } from "vitest";
import { consumeEdgeRateLimit } from "@/lib/rate-limit";

describe("consumeEdgeRateLimit", () => {
	it("allows requests until limit then blocks within same window", () => {
		const nowMs = Date.now();
		const key = `test-edge-limit-${nowMs}`;

		expect(consumeEdgeRateLimit({ key, limit: 2, windowMs: 60_000, nowMs }).allowed).toBe(true);
		expect(consumeEdgeRateLimit({ key, limit: 2, windowMs: 60_000, nowMs: nowMs + 1 }).allowed).toBe(true);

		const blocked = consumeEdgeRateLimit({ key, limit: 2, windowMs: 60_000, nowMs: nowMs + 2 });
		expect(blocked.allowed).toBe(false);
		expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
	});

	it("resets after window expires", () => {
		const nowMs = Date.now();
		const key = `test-edge-limit-reset-${nowMs}`;

		consumeEdgeRateLimit({ key, limit: 1, windowMs: 1_000, nowMs });
		expect(consumeEdgeRateLimit({ key, limit: 1, windowMs: 1_000, nowMs: nowMs + 10 }).allowed).toBe(false);
		expect(consumeEdgeRateLimit({ key, limit: 1, windowMs: 1_000, nowMs: nowMs + 1_500 }).allowed).toBe(true);
	});
});
