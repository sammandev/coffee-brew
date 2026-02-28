import type { RatingAggregate, ReviewInput } from "@/lib/types";
import { average } from "@/lib/utils";

export function toOverallScore(review: ReviewInput) {
	const values = [review.acidity, review.sweetness, review.body, review.aroma, review.balance];
	return Number(average(values).toFixed(2));
}

export function aggregateRatings(
	reviews: Array<Pick<ReviewInput, "acidity" | "sweetness" | "body" | "aroma" | "balance">>,
): RatingAggregate {
	if (reviews.length === 0) {
		return {
			overall: 0,
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

	return {
		overall: Number(average([acidity, sweetness, body, aroma, balance]).toFixed(2)),
		acidity,
		sweetness,
		body,
		aroma,
		balance,
		total: reviews.length,
	};
}
