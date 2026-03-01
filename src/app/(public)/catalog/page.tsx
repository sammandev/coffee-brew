import { CatalogBrewGrid } from "@/components/catalog/catalog-brew-grid";
import { CatalogSearchControls } from "@/components/catalog/catalog-search-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { normalizeCatalogSort, sortCatalogRows } from "@/lib/brew-catalog";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublishedBrews } from "@/lib/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface CatalogPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
	const [{ locale, t }, params, brews, session] = await Promise.all([
		getServerI18n(),
		searchParams,
		getPublishedBrews(160),
		getSessionContext(),
	]);
	const q = getFirstParam(params.q).trim().toLowerCase();
	const tag = getFirstParam(params.tag).trim().toLowerCase();
	const method = getFirstParam(params.method).trim().toLowerCase();
	const roastery = getFirstParam(params.roastery).trim().toLowerCase();
	const brewer = getFirstParam(params.brewer).trim().toLowerCase();
	const minRatingParam = getFirstParam(params.minRating).trim();
	const sortParam = getFirstParam(params.sort).trim();
	const minRating = Number.isFinite(Number(minRatingParam)) ? Math.max(0, Math.min(5, Number(minRatingParam))) : 0;
	const sort = normalizeCatalogSort(sortParam);

	const popularTagCounts = new Map<string, number>();
	for (const brew of brews) {
		for (const rawTag of brew.tags ?? []) {
			const normalized = rawTag.trim().toLowerCase();
			if (!normalized) continue;
			popularTagCounts.set(normalized, (popularTagCounts.get(normalized) ?? 0) + 1);
		}
	}
	const popularTags = Array.from(popularTagCounts.entries())
		.sort((left, right) => right[1] - left[1])
		.slice(0, 12)
		.map(([value]) => value);

	const brewIds = brews.map((brew) => brew.id);
	const supabase = await createSupabaseServerClient();
	const { data: reviewRows } =
		brewIds.length > 0
			? await supabase.from("brew_reviews").select("brew_id, overall").in("brew_id", brewIds)
			: { data: [] as Array<{ brew_id: string; overall: number }> };

	const aggregateMap = new Map<string, { count: number; score: number }>();
	for (const reviewRow of reviewRows ?? []) {
		const aggregate = aggregateMap.get(reviewRow.brew_id) ?? { count: 0, score: 0 };
		aggregate.count += 1;
		aggregate.score += Number(reviewRow.overall);
		aggregateMap.set(reviewRow.brew_id, aggregate);
	}

	const preparedBrews = brews.map((brew) => {
		const aggregate = aggregateMap.get(brew.id);
		const reviewTotal = aggregate?.count ?? 0;
		const ratingAverage = reviewTotal > 0 ? (aggregate?.score ?? 0) / reviewTotal : 0;
		return {
			...brew,
			rating_avg: ratingAverage,
			review_total: reviewTotal,
		};
	});

	const filteredBrews = preparedBrews
		.filter((brew) => {
			if (q.length === 0) return true;
			const haystack =
				`${brew.name} ${brew.coffee_beans} ${brew.brand_roastery} ${brew.brewer_name} ${brew.brew_method} ${(brew.tags ?? []).join(" ")}`.toLowerCase();
			return haystack.includes(q);
		})
		.filter((brew) => {
			if (tag.length === 0) return true;
			return (brew.tags ?? []).some((brewTag: string) => brewTag.trim().toLowerCase() === tag);
		})
		.filter((brew) => {
			if (method.length === 0) return true;
			return brew.brew_method.toLowerCase().includes(method);
		})
		.filter((brew) => {
			if (roastery.length === 0) return true;
			return brew.brand_roastery.toLowerCase().includes(roastery);
		})
		.filter((brew) => {
			if (brewer.length === 0) return true;
			return brew.brewer_name.toLowerCase().includes(brewer);
		})
		.filter((brew) => brew.rating_avg >= minRating);
	const filteredAndSortedBrews = sortCatalogRows(filteredBrews, sort);

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<Badge>{t("nav.catalog")}</Badge>
				<h1 className="font-heading text-4xl text-(--espresso)">{t("catalog.title")}</h1>
				<p className="text-(--muted)">{t("catalog.subtitle")}</p>
				<CatalogSearchControls
					locale={locale}
					initialQuery={q}
					initialTag={tag}
					initialMethod={method}
					initialRoastery={roastery}
					initialBrewer={brewer}
					initialMinRating={minRatingParam}
					initialSort={sort}
					popularTags={popularTags}
				/>
			</header>

			{brews.length === 0 ? (
				<Card>
					<CardTitle>{locale === "id" ? "Belum ada racikan publik" : "No published brews yet"}</CardTitle>
					<CardDescription>
						{locale === "id"
							? "Jadilah yang pertama mempublikasikan racikan dari dashboard."
							: "Be the first to publish one from your dashboard."}
					</CardDescription>
				</Card>
			) : filteredBrews.length === 0 ? (
				<Card>
					<CardTitle>{t("catalog.noResultsTitle")}</CardTitle>
					<CardDescription>{t("catalog.noResultsDescription")}</CardDescription>
				</Card>
			) : (
				<CatalogBrewGrid brews={filteredAndSortedBrews} locale={locale} isAuthenticated={Boolean(session)} />
			)}
		</div>
	);
}
