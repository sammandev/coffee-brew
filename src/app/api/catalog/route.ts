import { apiError, apiOk } from "@/lib/api";
import { normalizeCatalogSort, sortCatalogRows } from "@/lib/brew-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase-errors";

const BREW_OPTIONAL_COLUMNS = [
	"image_url",
	"image_alt",
	"tags",
	"bean_process",
	"recommended_methods",
	"grind_reference_image_url",
	"grind_reference_image_alt",
] as const;

function firstParam(value: string | null) {
	return String(value ?? "").trim();
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const q = firstParam(url.searchParams.get("q")).toLowerCase();
	const method = firstParam(url.searchParams.get("method")).toLowerCase();
	const roastery = firstParam(url.searchParams.get("roastery")).toLowerCase();
	const brewer = firstParam(url.searchParams.get("brewer")).toLowerCase();
	const tag = firstParam(url.searchParams.get("tag")).toLowerCase();
	const minRatingRaw = firstParam(url.searchParams.get("minRating"));
	const minRating = Number.isFinite(Number(minRatingRaw)) ? Math.max(0, Math.min(5, Number(minRatingRaw))) : 0;
	const sort = normalizeCatalogSort(url.searchParams.get("sort"));

	const supabase = await createSupabaseServerClient();
	const primary = await supabase
		.from("brews")
		.select(
			"id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, grind_reference_image_url, grind_reference_image_alt, recommended_methods, tags, created_at, temperature, water_ppm",
		)
		.eq("status", "published")
		.order("created_at", { ascending: false })
		.limit(220);

	let rows = primary.data ?? [];

	if (primary.error && isMissingColumnError(primary.error, [...BREW_OPTIONAL_COLUMNS])) {
		console.warn("[catalog] optional brew columns missing; retrying with compatibility query");
		const fallback = await supabase
			.from("brews")
			.select("id, name, brew_method, coffee_beans, brand_roastery, brewer_name, created_at, temperature, water_ppm")
			.eq("status", "published")
			.order("created_at", { ascending: false })
			.limit(220);
		if (fallback.error) {
			return apiError("Could not load catalog", 400, fallback.error.message);
		}
		rows = (fallback.data ?? []).map((item) => ({
			...item,
			image_url: null,
			image_alt: null,
			bean_process: null,
			grind_reference_image_url: null,
			grind_reference_image_alt: null,
			recommended_methods: [],
			tags: [],
		}));
	} else if (primary.error) {
		return apiError("Could not load catalog", 400, primary.error.message);
	}

	const brewIds = rows.map((brew) => brew.id);
	const { data: reviewRows } =
		brewIds.length > 0
			? await supabase.from("brew_reviews").select("brew_id, overall").in("brew_id", brewIds)
			: { data: [] as Array<{ brew_id: string; overall: number }> };

	const aggregateMap = new Map<string, { count: number; score: number }>();
	for (const review of reviewRows ?? []) {
		const current = aggregateMap.get(review.brew_id) ?? { count: 0, score: 0 };
		current.count += 1;
		current.score += Number(review.overall);
		aggregateMap.set(review.brew_id, current);
	}

	const prepared = rows
		.map((row) => {
			const aggregate = aggregateMap.get(row.id) ?? { count: 0, score: 0 };
			const ratingAvg = aggregate.count > 0 ? aggregate.score / aggregate.count : 0;
			const reviewTotal = aggregate.count;
			return {
				...row,
				rating_avg: ratingAvg,
				review_total: reviewTotal,
			};
		})
		.filter((row) => {
			if (q.length > 0) {
				const haystack =
					`${row.name} ${row.coffee_beans} ${row.brand_roastery} ${row.brewer_name} ${row.brew_method} ${(row.tags ?? []).join(" ")}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			if (
				method.length > 0 &&
				!String(row.brew_method ?? "")
					.toLowerCase()
					.includes(method)
			)
				return false;
			if (
				roastery.length > 0 &&
				!String(row.brand_roastery ?? "")
					.toLowerCase()
					.includes(roastery)
			)
				return false;
			if (
				brewer.length > 0 &&
				!String(row.brewer_name ?? "")
					.toLowerCase()
					.includes(brewer)
			)
				return false;
			if (tag.length > 0 && !Array.isArray(row.tags)) return false;
			if (tag.length > 0 && !row.tags.some((rowTag: string) => String(rowTag).trim().toLowerCase() === tag)) return false;
			if (row.rating_avg < minRating) return false;
			return true;
		});

	const items = sortCatalogRows(prepared, sort);
	return apiOk({ items, sort });
}
