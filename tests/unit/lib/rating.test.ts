import { aggregateRatings, toOverallScore } from "@/lib/rating";

describe("rating helpers", () => {
	it("calculates overall score for single review", () => {
		const overall = toOverallScore({
			acidity: 5,
			sweetness: 4,
			body: 4,
			aroma: 5,
			balance: 4,
			star_rating: null,
		});

		expect(overall).toBe(4.4);
	});

	it("aggregates review dimensions", () => {
		const aggregate = aggregateRatings([
			{ acidity: 5, sweetness: 4, body: 3, aroma: 4, balance: 4, star_rating: 4 },
			{ acidity: 3, sweetness: 5, body: 4, aroma: 5, balance: 5, star_rating: 5 },
		]);

		expect(aggregate.total).toBe(2);
		expect(aggregate.acidity).toBe(4);
		expect(aggregate.flavor_avg).toBeGreaterThan(0);
		expect(aggregate.star_histogram[4]).toBe(1);
		expect(aggregate.star_histogram[5]).toBe(1);
		expect(aggregate.star_histogram[1]).toBe(0);
	});

	it("computes star_avg from non-null star_rating values", () => {
		const aggregate = aggregateRatings([
			{ acidity: 4, sweetness: 4, body: 4, aroma: 4, balance: 4, star_rating: 4 },
			{ acidity: 4, sweetness: 4, body: 4, aroma: 4, balance: 4, star_rating: null },
			{ acidity: 4, sweetness: 4, body: 4, aroma: 4, balance: 4, star_rating: 2 },
		]);

		expect(aggregate.star_avg).toBe(3);
	});

	it("returns star_avg of 0 when all star_ratings are null", () => {
		const aggregate = aggregateRatings([{ acidity: 4, sweetness: 4, body: 4, aroma: 4, balance: 4, star_rating: null }]);

		expect(aggregate.star_avg).toBe(0);
	});
});
