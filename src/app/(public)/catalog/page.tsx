import Image from "next/image";
import Link from "next/link";
import { CatalogSearchControls } from "@/components/catalog/catalog-search-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublishedBrews } from "@/lib/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

interface CatalogPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
	const [{ locale, t }, params, brews] = await Promise.all([getServerI18n(), searchParams, getPublishedBrews(160)]);
	const q = getFirstParam(params.q).trim().toLowerCase();
	const tag = getFirstParam(params.tag).trim().toLowerCase();
	const method = getFirstParam(params.method).trim().toLowerCase();
	const roastery = getFirstParam(params.roastery).trim().toLowerCase();
	const brewer = getFirstParam(params.brewer).trim().toLowerCase();
	const minRatingParam = getFirstParam(params.minRating).trim();
	const sortParam = getFirstParam(params.sort).trim();
	const minRating = Number.isFinite(Number(minRatingParam)) ? Math.max(0, Math.min(5, Number(minRatingParam))) : 0;
	const sort = sortParam || "latest";

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
		.filter((brew) => brew.rating_avg >= minRating)
		.sort((left, right) => {
			if (sort === "oldest") {
				return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
			}
			if (sort === "highest_rated") {
				if (right.rating_avg !== left.rating_avg) return right.rating_avg - left.rating_avg;
				return right.review_total - left.review_total;
			}
			if (sort === "most_reviewed") {
				if (right.review_total !== left.review_total) return right.review_total - left.review_total;
				return right.rating_avg - left.rating_avg;
			}
			return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
		});

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
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{filteredBrews.map((brew) => (
						<Link href={`/brew/${brew.id}`} key={brew.id}>
							<Card className="h-full overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-[0_16px_50px_-25px_var(--overlay)]">
								<div className="relative aspect-[16/10] w-full">
									<Image
										src={resolveBrewImageUrl(brew.image_url)}
										alt={brew.image_alt || brew.name}
										fill
										sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
										className="object-cover"
									/>
								</div>
								<div className="space-y-2 p-5">
									<CardTitle>{brew.name}</CardTitle>
									<CardDescription className="mt-1">{brew.brew_method}</CardDescription>
									{Array.isArray(brew.tags) && brew.tags.length > 0 ? (
										<div className="mt-2 flex flex-wrap gap-1.5">
											{brew.tags.slice(0, 5).map((tag: string) => (
												<span key={`${brew.id}-${tag}`} className="rounded-full border px-2 py-0.5 text-[11px] text-(--muted)">
													#{tag}
												</span>
											))}
										</div>
									) : null}
									<p className="mt-2 text-sm text-(--muted)">Beans: {brew.coffee_beans}</p>
									<p className="text-sm text-(--muted)">Roastery: {brew.brand_roastery}</p>
									<p className="text-sm text-(--muted)">
										{locale === "id" ? "Rating" : "Rating"}:{" "}
										{brew.review_total > 0
											? `${brew.rating_avg.toFixed(2)} (${brew.review_total})`
											: locale === "id"
												? "Belum ada ulasan"
												: "No reviews yet"}
									</p>
									<p className="mt-3 text-xs text-(--muted)">
										{locale === "id" ? "Oleh" : "By"} {brew.brewer_name} {locale === "id" ? "pada" : "on"}{" "}
										{formatDate(brew.created_at, locale)}
									</p>
								</div>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
