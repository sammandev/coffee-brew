import { CatalogBrewGrid } from "@/components/catalog/catalog-brew-grid";
import { CatalogSearchControls } from "@/components/catalog/catalog-search-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { normalizeCatalogSort, sortCatalogRows } from "@/lib/brew-catalog";
import { getMessage } from "@/lib/i18n/messages";
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

	const { data: wishlistCountRows } =
		brewIds.length > 0
			? await supabase.rpc("get_brew_wishlist_counts", { brew_ids: brewIds })
			: { data: [] as Array<{ brew_id: string; wishlist_count: number }> };
	const wishlistCountMap = new Map<string, number>();
	for (const row of wishlistCountRows ?? []) {
		wishlistCountMap.set(row.brew_id, Number(row.wishlist_count));
	}

	const preparedBrews = brews.map((brew) => {
		const aggregate = aggregateMap.get(brew.id);
		const reviewTotal = aggregate?.count ?? 0;
		const ratingAverage = reviewTotal > 0 ? (aggregate?.score ?? 0) / reviewTotal : 0;
		return {
			...brew,
			rating_avg: ratingAverage,
			review_total: reviewTotal,
			wishlist_count: wishlistCountMap.get(brew.id) ?? 0,
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
	const m = (key: Parameters<typeof getMessage>[1]) => getMessage(locale, key);

	const hasActiveFilters =
		q.length > 0 || tag.length > 0 || method.length > 0 || roastery.length > 0 || brewer.length > 0 || minRating > 0;

	return (
		<div className="space-y-8">
			<header className="space-y-4">
				<div className="space-y-2">
					<Badge>{t("nav.catalog")}</Badge>
					<h1 className="font-heading text-4xl text-(--espresso)">{t("catalog.title")}</h1>
					<p className="max-w-2xl text-(--muted)">{t("catalog.subtitle")}</p>
				</div>
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
				<Card className="flex flex-col items-center py-16 text-center">
					<div className="mb-4 rounded-full bg-(--sand)/20 p-4">
						<svg
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-(--muted)"
							aria-hidden="true"
							focusable="false"
						>
							<path d="M17 8h1a4 4 0 1 1 0 8h-1" />
							<path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
							<line x1="6" x2="6" y1="2" y2="4" />
							<line x1="10" x2="10" y1="2" y2="4" />
							<line x1="14" x2="14" y1="2" y2="4" />
						</svg>
					</div>
					<CardTitle>{m("catalog.noPublishedTitle")}</CardTitle>
					<CardDescription className="mt-2">{m("catalog.noPublishedDescription")}</CardDescription>
					<a
						href="/dashboard/brews/new"
						className="mt-5 inline-flex items-center gap-2 rounded-full bg-(--espresso) px-5 py-2.5 text-sm font-semibold text-(--oat) transition hover:opacity-90"
					>
						{m("catalog.goToDashboard")}
					</a>
				</Card>
			) : filteredBrews.length === 0 ? (
				<Card className="flex flex-col items-center py-16 text-center">
					<div className="mb-4 rounded-full bg-(--sand)/20 p-4">
						<svg
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-(--muted)"
							aria-hidden="true"
							focusable="false"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.3-4.3" />
							<path d="M11 8v6" />
							<path d="M8 11h6" />
						</svg>
					</div>
					<CardTitle>{t("catalog.noResultsTitle")}</CardTitle>
					<CardDescription className="mt-2">{m("catalog.adjustFilters")}</CardDescription>
				</Card>
			) : (
				<>
					{hasActiveFilters ? (
						<p className="text-sm text-(--muted)">
							<span className="font-semibold text-(--espresso)">{filteredAndSortedBrews.length}</span>{" "}
							{m("catalog.brewsFound")}
						</p>
					) : null}
					<CatalogBrewGrid brews={filteredAndSortedBrews} locale={locale} isAuthenticated={Boolean(session)} />
				</>
			)}
		</div>
	);
}
