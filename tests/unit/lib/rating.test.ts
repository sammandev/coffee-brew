import { aggregateRatings, toOverallScore } from "@/lib/rating";

describe("rating helpers", () => {
	it("calculates overall score for single review", () => {
		const overall = toOverallScore({
			acidity: 5,
			sweetness: 4,
			body: 4,
			aroma: 5,
			balance: 4,
		});

		expect(overall).toBe(4.4);
	});

	it("aggregates review dimensions", () => {
		const aggregate = aggregateRatings([
			{ acidity: 5, sweetness: 4, body: 3, aroma: 4, balance: 4 },
			{ acidity: 3, sweetness: 5, body: 4, aroma: 5, balance: 5 },
		]);

		expect(aggregate.total).toBe(2);
		expect(aggregate.acidity).toBe(4);
		expect(aggregate.overall).toBeGreaterThan(0);
	});
});
