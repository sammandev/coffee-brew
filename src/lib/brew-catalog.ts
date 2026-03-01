import type { BrewRecommendedMethod } from "@/lib/types";

export const BREW_RECOMMENDED_METHODS: BrewRecommendedMethod[] = ["espresso", "cold_brew", "pour_over"];

export const CATALOG_SORT_VALUES = ["newest", "highest_stars", "most_reviews", "oldest", "smart"] as const;
export type CatalogSortValue = (typeof CATALOG_SORT_VALUES)[number];

const CATALOG_SORT_ALIAS_MAP: Record<string, CatalogSortValue> = {
	latest: "newest",
	newest: "newest",
	highest_rated: "highest_stars",
	highest_stars: "highest_stars",
	most_reviewed: "most_reviews",
	most_reviews: "most_reviews",
	oldest: "oldest",
	smart: "smart",
};

export function normalizeCatalogSort(value: string | null | undefined): CatalogSortValue {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();
	return CATALOG_SORT_ALIAS_MAP[normalized] ?? "newest";
}

export function normalizeRecommendedMethods(raw: unknown): BrewRecommendedMethod[] {
	if (!Array.isArray(raw)) return [];
	const normalized: BrewRecommendedMethod[] = [];

	for (const item of raw) {
		if (typeof item !== "string") continue;
		const value = item.trim().toLowerCase() as BrewRecommendedMethod;
		if (!BREW_RECOMMENDED_METHODS.includes(value)) continue;
		if (normalized.includes(value)) continue;
		normalized.push(value);
	}

	return normalized.slice(0, 3);
}

export interface BrewCatalogSortRow {
	created_at: string;
	rating_avg: number;
	review_total: number;
}

function getSmartScore(row: BrewCatalogSortRow) {
	const rating = Number.isFinite(row.rating_avg) ? row.rating_avg : 0;
	const reviews = Math.max(0, Math.trunc(row.review_total));
	const createdMs = new Date(row.created_at).getTime();
	const ageDays = Number.isFinite(createdMs) ? Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60 * 24)) : 365;

	// Bayesian-style smoothing plus review confidence and recency.
	const priorMean = 3.75;
	const priorWeight = 5;
	const bayesianRating = (rating * reviews + priorMean * priorWeight) / (reviews + priorWeight);
	const reviewConfidence = Math.log2(reviews + 1) * 0.18;
	const freshness = Math.max(0, 1 - ageDays / 60) * 0.35;

	return bayesianRating + reviewConfidence + freshness;
}

export function sortCatalogRows<T extends BrewCatalogSortRow>(rows: T[], sort: CatalogSortValue): T[] {
	const next = [...rows];

	switch (sort) {
		case "oldest":
			return next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
		case "highest_stars":
			return next.sort((a, b) => {
				if (b.rating_avg !== a.rating_avg) return b.rating_avg - a.rating_avg;
				if (b.review_total !== a.review_total) return b.review_total - a.review_total;
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			});
		case "most_reviews":
			return next.sort((a, b) => {
				if (b.review_total !== a.review_total) return b.review_total - a.review_total;
				if (b.rating_avg !== a.rating_avg) return b.rating_avg - a.rating_avg;
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			});
		case "smart":
			return next.sort((a, b) => {
				const scoreDiff = getSmartScore(b) - getSmartScore(a);
				if (scoreDiff !== 0) return scoreDiff;
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			});
		default:
			return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	}
}

export function recommendedMethodMeta(value: BrewRecommendedMethod, locale: "en" | "id") {
	if (value === "espresso") {
		return {
			iconKey: "espresso" as const,
			label: locale === "id" ? "Cocok untuk Espresso" : "Best for Espresso",
		};
	}
	if (value === "cold_brew") {
		return {
			iconKey: "cold_brew" as const,
			label: locale === "id" ? "Bagus untuk Cold Brew" : "Great for Cold Brew",
		};
	}
	return {
		iconKey: "pour_over" as const,
		label: locale === "id" ? "Optimal untuk Pour-Over" : "Optimized for Pour-Over",
	};
}
