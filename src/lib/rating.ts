import type { RatingAggregate, ReviewInput } from "@/lib/types";
import { average } from "@/lib/utils";

export function toOverallScore(review: ReviewInput) {
	const values = [review.acidity, review.sweetness, review.body, review.aroma, review.balance];
	return Number(average(values).toFixed(2));
}

export function aggregateRatings(
	reviews: Array<Pick<ReviewInput, "acidity" | "sweetness" | "body" | "aroma" | "balance" | "star_rating">>,
): RatingAggregate {
	const emptyHistogram: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

	if (reviews.length === 0) {
		return {
			flavor_avg: 0,
			star_avg: 0,
			star_histogram: emptyHistogram,
			acidity: 0,
			sweetness: 0,
			body: 0,
			aroma: 0,
			balance: 0,
			total: 0,
		};
	}

	const acidity = Number(average(reviews.map((review) => review.acidity)).toFixed(2));
	const sweetness = Number(average(reviews.map((review) => review.sweetness)).toFixed(2));
	const body = Number(average(reviews.map((review) => review.body)).toFixed(2));
	const aroma = Number(average(reviews.map((review) => review.aroma)).toFixed(2));
	const balance = Number(average(reviews.map((review) => review.balance)).toFixed(2));

	const starValues = reviews.map((r) => r.star_rating).filter((v): v is number => v != null);
	const star_avg = starValues.length > 0 ? Number(average(starValues).toFixed(2)) : 0;
	const star_histogram: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	for (const v of starValues) {
		if (v >= 1 && v <= 5) {
			star_histogram[v as 1 | 2 | 3 | 4 | 5] += 1;
		}
	}

	return {
		flavor_avg: Number(average([acidity, sweetness, body, aroma, balance]).toFixed(2)),
		star_avg,
		star_histogram,
		acidity,
		sweetness,
		body,
		aroma,
		balance,
		total: reviews.length,
	};
}
