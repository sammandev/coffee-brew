import Link from "next/link";
import { CatalogBrewGrid } from "@/components/catalog/catalog-brew-grid";
import { CatalogSearchControls } from "@/components/catalog/catalog-search-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { normalizeCatalogSort, sortCatalogRows } from "@/lib/brew-catalog";
import { getMessage } from "@/lib/i18n/messages";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PER_PAGE = 24;
const AGGREGATE_CANDIDATE_LIMIT = 320;

interface CatalogBrewRawRow {
	bean_process: string | null;
	brew_method: string;
	brewer_name: string;
	brand_roastery: string;
	coffee_beans: string;
	created_at: string;
	id: string;
	image_alt: string | null;
	image_url: string | null;
	name: string;
	recommended_methods: string[] | null;
	status: string;
	tags: string[] | null;
	grind_reference_image_url: string | null;
	grind_reference_image_alt: string | null;
}

interface CatalogBrewViewRow extends CatalogBrewRawRow {
	rating_avg: number;
	review_count: number;
	review_total: number;
	wishlist_count: number;
}

interface CatalogPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

function buildCatalogHref(page: number, params: Record<string, string>) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		const trimmed = value.trim();
		if (trimmed.length > 0) query.set(key, trimmed);
	}
	query.set("page", String(page));
	return `/catalog?${query.toString()}`;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
	const [{ locale, t }, params, session] = await Promise.all([getServerI18n(), searchParams, getSessionContext()]);
	const supabase = await createSupabaseServerClient();
	const q = getFirstParam(params.q).trim().toLowerCase();
	const tag = getFirstParam(params.tag).trim().toLowerCase();
	const method = getFirstParam(params.method).trim().toLowerCase();
	const roastery = getFirstParam(params.roastery).trim().toLowerCase();
	const brewer = getFirstParam(params.brewer).trim().toLowerCase();
	const minRatingParam = getFirstParam(params.minRating).trim();
	const sortParam = getFirstParam(params.sort).trim();
	const pageParam = Number(getFirstParam(params.page));
	const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
	const minRating = Number.isFinite(Number(minRatingParam)) ? Math.max(0, Math.min(5, Number(minRatingParam))) : 0;
	const sort = normalizeCatalogSort(sortParam);
	const needsAggregateSort = sort === "smart" || sort === "highest_stars" || sort === "most_reviews" || minRating > 0;

	let popularTagsQuery = supabase
		.from("brews")
		.select("tags")
		.eq("status", "published")
		.order("created_at", { ascending: false })
		.limit(240);
	if (q.length > 0) {
		const escaped = q.replace(/[,%_]/g, "").trim();
		if (escaped.length > 0) {
			popularTagsQuery = popularTagsQuery.or(
				`name.ilike.%${escaped}%,coffee_beans.ilike.%${escaped}%,brand_roastery.ilike.%${escaped}%,brewer_name.ilike.%${escaped}%,brew_method.ilike.%${escaped}%`,
			);
		}
	}
	if (tag.length > 0) popularTagsQuery = popularTagsQuery.contains("tags", [tag]);
	if (method.length > 0) popularTagsQuery = popularTagsQuery.ilike("brew_method", `%${method}%`);
	if (roastery.length > 0) popularTagsQuery = popularTagsQuery.ilike("brand_roastery", `%${roastery}%`);
	if (brewer.length > 0) popularTagsQuery = popularTagsQuery.ilike("brewer_name", `%${brewer}%`);
	const { data: popularTagRows } = await popularTagsQuery;

	const popularTagCounts = new Map<string, number>();
	for (const brew of popularTagRows ?? []) {
		for (const rawTag of brew.tags ?? []) {
			const normalized = String(rawTag).trim().toLowerCase();
			if (!normalized) continue;
			popularTagCounts.set(normalized, (popularTagCounts.get(normalized) ?? 0) + 1);
		}
	}
	const popularTags = Array.from(popularTagCounts.entries())
		.sort((left, right) => right[1] - left[1])
		.slice(0, 12)
		.map(([value]) => value);

	let brews: CatalogBrewViewRow[] = [];
	let totalRows = 0;

	if (needsAggregateSort) {
		let filtered = supabase
			.from("brews")
			.select(
				"id, name, brew_method, status, created_at, coffee_beans, brand_roastery, brewer_name, tags, image_url, image_alt, recommended_methods, bean_process, grind_reference_image_url, grind_reference_image_alt",
			)
			.eq("status", "published")
			.order("created_at", { ascending: false })
			.limit(AGGREGATE_CANDIDATE_LIMIT);
		if (q.length > 0) {
			const escaped = q.replace(/[,%_]/g, "").trim();
			if (escaped.length > 0) {
				filtered = filtered.or(
					`name.ilike.%${escaped}%,coffee_beans.ilike.%${escaped}%,brand_roastery.ilike.%${escaped}%,brewer_name.ilike.%${escaped}%,brew_method.ilike.%${escaped}%`,
				);
			}
		}
		if (tag.length > 0) filtered = filtered.contains("tags", [tag]);
		if (method.length > 0) filtered = filtered.ilike("brew_method", `%${method}%`);
		if (roastery.length > 0) filtered = filtered.ilike("brand_roastery", `%${roastery}%`);
		if (brewer.length > 0) filtered = filtered.ilike("brewer_name", `%${brewer}%`);
		const { data: candidateRows } = await filtered;
		const typedCandidates = (candidateRows ?? []) as CatalogBrewRawRow[];
		const brewIds = typedCandidates.map((row) => row.id);

		const [{ data: reviewRows }, { data: wishlistCountRows }] = await Promise.all([
			brewIds.length > 0
				? supabase.from("brew_reviews").select("brew_id, overall").in("brew_id", brewIds)
				: Promise.resolve({ data: [] as Array<{ brew_id: string; overall: number }> }),
			brewIds.length > 0
				? supabase.rpc("get_brew_wishlist_counts", { brew_ids: brewIds })
				: Promise.resolve({ data: [] as Array<{ brew_id: string; wishlist_count: number }> }),
		]);

		const aggregateMap = new Map<string, { count: number; score: number }>();
		for (const reviewRow of reviewRows ?? []) {
			const aggregate = aggregateMap.get(reviewRow.brew_id) ?? { count: 0, score: 0 };
			aggregate.count += 1;
			aggregate.score += Number(reviewRow.overall);
			aggregateMap.set(reviewRow.brew_id, aggregate);
		}
		const wishlistCountMap = new Map<string, number>();
		for (const row of wishlistCountRows ?? []) {
			wishlistCountMap.set(row.brew_id, Number(row.wishlist_count));
		}

		const rankedRows = sortCatalogRows(
			typedCandidates
				.map((brew) => {
					const aggregate = aggregateMap.get(String(brew.id));
					const reviewTotal = aggregate?.count ?? 0;
					const ratingAverage = reviewTotal > 0 ? (aggregate?.score ?? 0) / reviewTotal : 0;
					return {
						id: String(brew.id),
						name: String(brew.name ?? ""),
						brew_method: String(brew.brew_method ?? ""),
						status: String(brew.status ?? "published"),
						created_at: String(brew.created_at ?? new Date().toISOString()),
						rating_avg: ratingAverage,
						review_total: reviewTotal,
						review_count: reviewTotal,
						coffee_beans: String(brew.coffee_beans ?? ""),
						brand_roastery: String(brew.brand_roastery ?? ""),
						brewer_name: String(brew.brewer_name ?? ""),
						tags: Array.isArray(brew.tags) ? brew.tags : [],
						image_url: typeof brew.image_url === "string" ? brew.image_url : null,
						image_alt: typeof brew.image_alt === "string" ? brew.image_alt : null,
						recommended_methods: Array.isArray(brew.recommended_methods) ? brew.recommended_methods : [],
						bean_process: typeof brew.bean_process === "string" ? brew.bean_process : null,
						grind_reference_image_url:
							typeof brew.grind_reference_image_url === "string" ? brew.grind_reference_image_url : null,
						grind_reference_image_alt:
							typeof brew.grind_reference_image_alt === "string" ? brew.grind_reference_image_alt : null,
						wishlist_count: wishlistCountMap.get(String(brew.id)) ?? 0,
					};
				})
				.filter((brew) => brew.rating_avg >= minRating),
			sort,
		);

		totalRows = rankedRows.length;
		const from = (page - 1) * PER_PAGE;
		brews = rankedRows.slice(from, from + PER_PAGE);
	} else {
		const from = (page - 1) * PER_PAGE;
		const to = from + PER_PAGE - 1;
		let pageQuery = supabase
			.from("brews")
			.select(
				"id, name, brew_method, status, created_at, coffee_beans, brand_roastery, brewer_name, tags, image_url, image_alt, recommended_methods, bean_process, grind_reference_image_url, grind_reference_image_alt",
				{ count: "exact" },
			)
			.eq("status", "published")
			.range(from, to);
		if (q.length > 0) {
			const escaped = q.replace(/[,%_]/g, "").trim();
			if (escaped.length > 0) {
				pageQuery = pageQuery.or(
					`name.ilike.%${escaped}%,coffee_beans.ilike.%${escaped}%,brand_roastery.ilike.%${escaped}%,brewer_name.ilike.%${escaped}%,brew_method.ilike.%${escaped}%`,
				);
			}
		}
		if (tag.length > 0) pageQuery = pageQuery.contains("tags", [tag]);
		if (method.length > 0) pageQuery = pageQuery.ilike("brew_method", `%${method}%`);
		if (roastery.length > 0) pageQuery = pageQuery.ilike("brand_roastery", `%${roastery}%`);
		if (brewer.length > 0) pageQuery = pageQuery.ilike("brewer_name", `%${brewer}%`);

		pageQuery =
			sort === "oldest"
				? pageQuery.order("created_at", { ascending: true })
				: pageQuery.order("created_at", { ascending: false });
		const { data: pageRows, count } = await pageQuery;
		totalRows = count ?? 0;
		const typedPageRows = (pageRows ?? []) as CatalogBrewRawRow[];
		const brewIds = typedPageRows.map((row) => row.id);
		const [{ data: reviewRows }, { data: wishlistCountRows }] = await Promise.all([
			brewIds.length > 0
				? supabase.from("brew_reviews").select("brew_id, overall").in("brew_id", brewIds)
				: Promise.resolve({ data: [] as Array<{ brew_id: string; overall: number }> }),
			brewIds.length > 0
				? supabase.rpc("get_brew_wishlist_counts", { brew_ids: brewIds })
				: Promise.resolve({ data: [] as Array<{ brew_id: string; wishlist_count: number }> }),
		]);

		const aggregateMap = new Map<string, { count: number; score: number }>();
		for (const reviewRow of reviewRows ?? []) {
			const aggregate = aggregateMap.get(reviewRow.brew_id) ?? { count: 0, score: 0 };
			aggregate.count += 1;
			aggregate.score += Number(reviewRow.overall);
			aggregateMap.set(reviewRow.brew_id, aggregate);
		}
		const wishlistCountMap = new Map<string, number>();
		for (const row of wishlistCountRows ?? []) {
			wishlistCountMap.set(row.brew_id, Number(row.wishlist_count));
		}

		brews = typedPageRows.map((brew) => {
			const aggregate = aggregateMap.get(String(brew.id));
			const reviewTotal = aggregate?.count ?? 0;
			const ratingAverage = reviewTotal > 0 ? (aggregate?.score ?? 0) / reviewTotal : 0;
			return {
				id: String(brew.id),
				name: String(brew.name ?? ""),
				brew_method: String(brew.brew_method ?? ""),
				status: String(brew.status ?? "published"),
				created_at: String(brew.created_at ?? new Date().toISOString()),
				rating_avg: ratingAverage,
				review_count: reviewTotal,
				review_total: reviewTotal,
				coffee_beans: String(brew.coffee_beans ?? ""),
				brand_roastery: String(brew.brand_roastery ?? ""),
				brewer_name: String(brew.brewer_name ?? ""),
				tags: Array.isArray(brew.tags) ? brew.tags : [],
				image_url: typeof brew.image_url === "string" ? brew.image_url : null,
				image_alt: typeof brew.image_alt === "string" ? brew.image_alt : null,
				recommended_methods: Array.isArray(brew.recommended_methods) ? brew.recommended_methods : [],
				bean_process: typeof brew.bean_process === "string" ? brew.bean_process : null,
				grind_reference_image_url:
					typeof brew.grind_reference_image_url === "string" ? brew.grind_reference_image_url : null,
				grind_reference_image_alt:
					typeof brew.grind_reference_image_alt === "string" ? brew.grind_reference_image_alt : null,
				wishlist_count: wishlistCountMap.get(String(brew.id)) ?? 0,
			};
		});
	}

	const totalPages = Math.max(1, Math.ceil(totalRows / PER_PAGE));

	const filteredAndSortedBrews = brews;
	const m = (key: Parameters<typeof getMessage>[1]) => getMessage(locale, key);

	const hasActiveFilters =
		q.length > 0 || tag.length > 0 || method.length > 0 || roastery.length > 0 || brewer.length > 0 || minRating > 0;
	const baseFilterParams = {
		q,
		tag,
		method,
		roastery,
		brewer,
		minRating: minRatingParam,
		sort,
	};

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

			{totalRows === 0 ? (
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
			) : filteredAndSortedBrews.length === 0 ? (
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
							<span className="font-semibold text-(--espresso)">{totalRows}</span> {m("catalog.brewsFound")}
						</p>
					) : null}
					<CatalogBrewGrid brews={filteredAndSortedBrews} locale={locale} isAuthenticated={Boolean(session)} />
					{totalPages > 1 ? (
						<div className="flex flex-wrap items-center justify-center gap-2">
							{page > 1 ? (
								<Link
									href={buildCatalogHref(page - 1, baseFilterParams)}
									className="rounded-full border bg-(--surface-elevated) px-3.5 py-1.5 text-sm font-medium text-(--muted) transition hover:bg-(--sand)/20"
								>
									{locale === "id" ? "Sebelumnya" : "Previous"}
								</Link>
							) : null}
							<span className="text-sm text-(--muted)">
								{locale === "id" ? "Halaman" : "Page"} {page} / {totalPages}
							</span>
							{page < totalPages ? (
								<Link
									href={buildCatalogHref(page + 1, baseFilterParams)}
									className="rounded-full border bg-(--surface-elevated) px-3.5 py-1.5 text-sm font-medium text-(--muted) transition hover:bg-(--sand)/20"
								>
									{locale === "id" ? "Berikutnya" : "Next"}
								</Link>
							) : null}
						</div>
					) : null}
				</>
			)}
		</div>
	);
}
