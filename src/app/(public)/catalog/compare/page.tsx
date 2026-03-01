import Image from "next/image";
import Link from "next/link";
import { Children, type ReactNode } from "react";
import { FlavorRadarChart } from "@/components/brew/flavor-radar-chart";
import { MethodRecommendationChips } from "@/components/brew/method-recommendation-chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { parseCompareIds } from "@/lib/brew-collections";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { getMessage } from "@/lib/i18n/messages";
import { getServerI18n } from "@/lib/i18n/server";
import { aggregateRatings } from "@/lib/rating";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

interface ComparePageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export default async function CatalogComparePage({ searchParams }: ComparePageProps) {
	const [{ locale }, params, session, supabase] = await Promise.all([
		getServerI18n(),
		searchParams,
		getSessionContext(),
		createSupabaseServerClient(),
	]);
	const ids = parseCompareIds(firstParam(params.ids));
	const m = (key: Parameters<typeof getMessage>[1]) => getMessage(locale, key);

	if (ids.length < 2) {
		return (
			<div className="space-y-8">
				<header className="space-y-3">
					<nav aria-label="Breadcrumb" className="text-sm text-(--muted)">
						<ol className="flex items-center gap-1.5">
							<li>
								<Link href="/catalog" className="transition hover:text-(--espresso)">
									{m("compare.backToCatalog")}
								</Link>
							</li>
							<li aria-hidden="true" className="select-none">
								/
							</li>
							<li className="font-medium text-(--espresso)">{m("compare.title")}</li>
						</ol>
					</nav>
					<Badge>{m("compare.badge")}</Badge>
					<h1 className="font-heading text-4xl text-(--espresso)">{m("compare.title")}</h1>
					<p className="max-w-2xl text-(--muted)">{m("compare.subtitle")}</p>
				</header>
				<Card className="mx-auto max-w-lg text-center">
					<CardTitle>{m("compare.emptyTitle")}</CardTitle>
					<CardDescription className="mt-2">{m("compare.emptyDescription")}</CardDescription>
					<Link href="/catalog" className="mt-4 inline-block text-sm font-semibold text-(--accent) underline">
						{m("compare.backToCatalog")}
					</Link>
				</Card>
			</div>
		);
	}

	const { data: brews } = await supabase
		.from("brews")
		.select(
			"id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, grind_reference_image_url, grind_reference_image_alt, recommended_methods, tags, status, created_at, updated_at, water_type, water_ppm, temperature, temperature_unit, grind_size, grind_clicks, brew_time_seconds",
		)
		.in("id", ids)
		.eq("status", "published");

	const brewById = new Map((brews ?? []).map((brew) => [brew.id, brew]));
	const orderedBrews = ids
		.map((id) => brewById.get(id))
		.filter((brew): brew is NonNullable<typeof brew> => Boolean(brew));

	const brewIds = orderedBrews.map((brew) => brew.id);
	const [{ data: reviewRows }, { data: wishlistCountRows }] = await Promise.all([
		brewIds.length > 0
			? supabase
					.from("brew_reviews")
					.select("brew_id, reviewer_id, acidity, sweetness, body, aroma, balance, overall, updated_at")
					.in("brew_id", brewIds)
			: Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
		brewIds.length > 0
			? supabase.rpc("get_brew_wishlist_counts", { brew_ids: brewIds })
			: Promise.resolve({ data: [] as Array<{ brew_id: string; wishlist_count: number }> }),
	]);

	const wishlistMap = new Map<string, number>();
	for (const row of wishlistCountRows ?? []) {
		wishlistMap.set(String(row.brew_id), Number(row.wishlist_count));
	}

	const reviewMap = new Map<
		string,
		Array<{ acidity: number; sweetness: number; body: number; aroma: number; balance: number }>
	>();
	const myReviewMap = new Map<
		string,
		{
			acidity: number;
			aroma: number;
			balance: number;
			body: number;
			overall: number;
			sweetness: number;
			updated_at: string;
		}
	>();
	for (const review of reviewRows ?? []) {
		const brewId = String(review.brew_id ?? "");
		if (!brewId) continue;
		const current = reviewMap.get(brewId) ?? [];
		current.push({
			acidity: Number(review.acidity ?? 0),
			sweetness: Number(review.sweetness ?? 0),
			body: Number(review.body ?? 0),
			aroma: Number(review.aroma ?? 0),
			balance: Number(review.balance ?? 0),
		});
		reviewMap.set(brewId, current);

		if (session && review.reviewer_id === session.userId) {
			myReviewMap.set(brewId, {
				acidity: Number(review.acidity ?? 0),
				sweetness: Number(review.sweetness ?? 0),
				body: Number(review.body ?? 0),
				aroma: Number(review.aroma ?? 0),
				balance: Number(review.balance ?? 0),
				overall: Number(review.overall ?? 0),
				updated_at: String(review.updated_at ?? ""),
			});
		}
	}

	const aggregates = new Map(orderedBrews.map((brew) => [brew.id, aggregateRatings(reviewMap.get(brew.id) ?? [])]));
	const getAggregate = (brewId: string) => aggregates.get(brewId) ?? aggregateRatings([]);

	const DIMENSION_LABELS = [
		{ key: "acidity", label: locale === "id" ? "Asiditas" : "Acidity" },
		{ key: "sweetness", label: locale === "id" ? "Manis" : "Sweetness" },
		{ key: "body", label: locale === "id" ? "Body" : "Body" },
		{ key: "aroma", label: locale === "id" ? "Aroma" : "Aroma" },
		{ key: "balance", label: locale === "id" ? "Balance" : "Balance" },
	] as const;

	// Determine "winner" for overall rating
	let bestOverallId = "";
	let bestOverall = -1;
	for (const brew of orderedBrews) {
		const agg = aggregates.get(brew.id);
		if (agg && agg.overall > bestOverall && agg.total > 0) {
			bestOverall = agg.overall;
			bestOverallId = brew.id;
		}
	}

	const gridCols = orderedBrews.length === 2 ? "grid-cols-[180px_1fr_1fr]" : "grid-cols-[180px_1fr_1fr_1fr]";

	return (
		<div className="space-y-8">
			{/* Breadcrumb + Header */}
			<header className="space-y-3">
				<nav aria-label="Breadcrumb" className="text-sm text-(--muted)">
					<ol className="flex items-center gap-1.5">
						<li>
							<Link href="/catalog" className="transition hover:text-(--espresso)">
								{m("compare.backToCatalog")}
							</Link>
						</li>
						<li aria-hidden="true" className="select-none">
							/
						</li>
						<li className="font-medium text-(--espresso)">{m("compare.title")}</li>
					</ol>
				</nav>
				<div className="space-y-2">
					<Badge>{m("compare.badge")}</Badge>
					<h1 className="font-heading text-3xl text-(--espresso) lg:text-4xl">{m("compare.title")}</h1>
					<p className="max-w-2xl text-(--muted)">{m("compare.subtitle")}</p>
				</div>
			</header>

			{/* Hero cards: image + name + rating per brew */}
			<div className={`grid gap-4 ${orderedBrews.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
				{orderedBrews.map((brew) => {
					const agg = getAggregate(brew.id);
					const wishCount = wishlistMap.get(brew.id) ?? 0;
					const isBest = brew.id === bestOverallId;
					return (
						<Card key={brew.id} className="group relative overflow-hidden p-0 transition-shadow hover:shadow-lg">
							{isBest && agg.total > 0 ? (
								<span className="absolute top-3 right-3 z-10 rounded-full bg-(--crema) px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
									{m("compare.best")}
								</span>
							) : null}
							<div className="relative aspect-16/10 w-full overflow-hidden">
								<Image
									src={resolveBrewImageUrl(brew.image_url)}
									alt={brew.image_alt || brew.name}
									fill
									sizes="(max-width: 1280px) 50vw, 33vw"
									className="object-cover transition-transform duration-300 group-hover:scale-105"
								/>
								<span className="absolute bottom-3 left-3 z-10 rounded-full bg-(--surface-elevated)/90 px-2.5 py-1 text-xs font-semibold text-(--espresso) shadow-sm backdrop-blur-sm">
									{brew.brew_method}
								</span>
							</div>
							<div className="space-y-2 p-5">
								<Link href={`/brew/${brew.id}`} className="hover:underline">
									<h2 className="line-clamp-2 text-lg font-bold text-(--espresso)">{brew.name}</h2>
								</Link>
								<p className="text-sm text-(--muted)">
									{m("compare.brewer")}: {brew.brewer_name}
								</p>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-1">
										{[0, 1, 2, 3, 4].map((starIndex) => (
											<svg
												key={`${brew.id}-star-${starIndex}`}
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill={starIndex < Math.round(agg.overall) ? "var(--crema)" : "none"}
												stroke={starIndex < Math.round(agg.overall) ? "var(--crema)" : "var(--sand)"}
												strokeWidth="2"
												className="shrink-0"
												aria-hidden="true"
												focusable="false"
											>
												<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
											</svg>
										))}
										<span className="ml-1 text-sm font-semibold text-(--espresso)">
											{agg.total > 0 ? agg.overall.toFixed(1) : "—"}
										</span>
										<span className="text-xs text-(--muted)">({agg.total})</span>
									</div>
									<span className="inline-flex items-center gap-1 text-xs text-(--muted)">
										<svg
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill={wishCount > 0 ? "var(--danger)" : "none"}
											stroke={wishCount > 0 ? "var(--danger)" : "var(--sand)"}
											strokeWidth="2"
											className="shrink-0"
											aria-hidden="true"
											focusable="false"
										>
											<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
										</svg>
										{wishCount}
									</span>
								</div>
								<MethodRecommendationChips locale={locale} methods={brew.recommended_methods ?? []} />
							</div>
						</Card>
					);
				})}
			</div>

			{/* Recipe comparison table */}
			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-(--espresso)">{m("compare.recipeDetails")}</h2>
				<div className="overflow-x-auto">
					<div className={`grid min-w-150 ${gridCols}`}>
						{/* Header row */}
						<div className="border-b p-3" />
						{orderedBrews.map((brew) => (
							<div key={`header-${brew.id}`} className="border-b p-3 text-center">
								<span className="text-sm font-bold text-(--espresso)">{brew.name}</span>
							</div>
						))}

						{/* Overall Rating */}
						<CompareRow label={m("compare.overallRating")} even>
							{orderedBrews.map((brew) => {
								const agg = getAggregate(brew.id);
								return (
									<div key={`overall-${brew.id}`} className="flex flex-col items-center gap-1 p-3">
										<span className="text-2xl font-bold text-(--espresso)">{agg.total > 0 ? agg.overall.toFixed(1) : "—"}</span>
										<span className="text-xs text-(--muted)">
											{agg.total > 0 ? `${agg.total} ${m("compare.reviews")}` : m("compare.noReviews")}
										</span>
									</div>
								);
							})}
						</CompareRow>

						{/* Dimension bars */}
						{DIMENSION_LABELS.map(({ key, label }, idx) => {
							const values = orderedBrews.map((brew) => {
								const agg = getAggregate(brew.id);
								return Number(agg[key]) || 0;
							});
							const maxVal = Math.max(...values);
							return (
								<CompareRow key={key} label={label} even={idx % 2 === 1}>
									{orderedBrews.map((brew, i) => {
										const val = values[i];
										const pct = Math.min(100, (val / 5) * 100);
										const isMax = val > 0 && val === maxVal && values.filter((v) => v === maxVal).length === 1;
										return (
											<div key={`${key}-${brew.id}`} className="flex flex-col items-center gap-1 p-3">
												<div className="h-2 w-full max-w-28 overflow-hidden rounded-full bg-(--sand)/20">
													<div
														className={`h-full rounded-full transition-all ${isMax ? "bg-(--crema)" : "bg-(--sand)/50"}`}
														style={{ width: `${pct}%` }}
													/>
												</div>
												<span className={`text-xs font-semibold ${isMax ? "text-(--crema)" : "text-(--espresso)"}`}>
													{val.toFixed(1)}
												</span>
											</div>
										);
									})}
								</CompareRow>
							);
						})}

						{/* Brew Method */}
						<CompareRow label={m("brew.brewMethod")} even>
							{orderedBrews.map((brew) => (
								<div key={`method-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.brew_method}
								</div>
							))}
						</CompareRow>

						{/* Bean Process */}
						<CompareRow label={m("brew.beanProcess")} even={false}>
							{orderedBrews.map((brew) => (
								<div key={`process-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.bean_process ?? m("brew.notSet")}
								</div>
							))}
						</CompareRow>

						{/* Beans */}
						<CompareRow label={m("brew.beans")} even>
							{orderedBrews.map((brew) => (
								<div key={`beans-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.coffee_beans}
								</div>
							))}
						</CompareRow>

						{/* Roastery */}
						<CompareRow label={m("brew.roastery")} even={false}>
							{orderedBrews.map((brew) => (
								<div key={`roastery-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.brand_roastery}
								</div>
							))}
						</CompareRow>

						{/* Water */}
						<CompareRow label={m("compare.water")} even>
							{orderedBrews.map((brew) => (
								<div key={`water-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.water_type} ({brew.water_ppm} ppm)
								</div>
							))}
						</CompareRow>

						{/* Temperature */}
						<CompareRow label={m("brew.temperature")} even={false}>
							{orderedBrews.map((brew) => (
								<div key={`temp-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.temperature} {brew.temperature_unit}
								</div>
							))}
						</CompareRow>

						{/* Grind */}
						<CompareRow label={m("compare.grind")} even>
							{orderedBrews.map((brew) => (
								<div key={`grind-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.grind_size}
									{typeof brew.grind_clicks === "number" ? ` (${brew.grind_clicks} clicks)` : ""}
								</div>
							))}
						</CompareRow>

						{/* Brew Time */}
						<CompareRow label={m("brew.brewTime")} even={false}>
							{orderedBrews.map((brew) => (
								<div key={`time-${brew.id}`} className="p-3 text-center text-sm text-(--espresso)">
									{brew.brew_time_seconds}s
								</div>
							))}
						</CompareRow>

						{/* Updated */}
						<CompareRow label={m("brew.updated")} even>
							{orderedBrews.map((brew) => (
								<div key={`updated-${brew.id}`} className="p-3 text-center text-sm text-(--muted)">
									{formatDate(brew.updated_at, locale)}
								</div>
							))}
						</CompareRow>
					</div>
				</div>
			</section>

			{/* Flavor profile radar charts */}
			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-(--espresso)">{m("compare.flavorProfile")}</h2>
				<div className={`grid gap-4 ${orderedBrews.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
					{orderedBrews.map((brew) => {
						const aggregate = getAggregate(brew.id);
						const myReview = myReviewMap.get(brew.id) ?? null;
						return (
							<Card key={`radar-${brew.id}`} className="flex flex-col items-center gap-3 p-5">
								<h3 className="text-center text-sm font-bold text-(--espresso)">{brew.name}</h3>
								<FlavorRadarChart
									community={aggregate}
									myReview={myReview}
									labels={DIMENSION_LABELS.map(({ label }) => label) as [string, string, string, string, string]}
									communityLabel={locale === "id" ? "Komunitas" : "Community"}
									myReviewLabel={locale === "id" ? "Review Saya" : "My Review"}
									size={200}
								/>
							</Card>
						);
					})}
				</div>
			</section>

			{/* Grind reference comparison */}
			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-(--espresso)">{m("compare.grindReference")}</h2>
				<div className={`grid gap-4 ${orderedBrews.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
					{orderedBrews.map((brew) => (
						<Card key={`grind-${brew.id}`} className="space-y-3 p-0">
							<div className="relative aspect-4/3 w-full overflow-hidden rounded-t-xl">
								<Image
									src={resolveBrewImageUrl(brew.grind_reference_image_url)}
									alt={brew.grind_reference_image_alt || `${brew.name} grind reference`}
									fill
									sizes="(max-width: 1280px) 50vw, 33vw"
									className="object-cover"
								/>
							</div>
							<div className="space-y-1 px-5 pb-5">
								<p className="text-sm font-bold text-(--espresso)">{brew.name}</p>
								<p className="text-xs text-(--muted)">
									{brew.grind_size}
									{typeof brew.grind_clicks === "number" ? ` · ${brew.grind_clicks} clicks` : ""}
								</p>
							</div>
						</Card>
					))}
				</div>
			</section>

			{/* Links back to detail */}
			<section className="flex flex-wrap gap-3">
				{orderedBrews.map((brew) => (
					<Link
						key={`link-${brew.id}`}
						href={`/brew/${brew.id}`}
						className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-(--espresso) transition hover:bg-(--sand)/15"
					>
						{brew.name}
						<span aria-hidden="true">→</span>
					</Link>
				))}
			</section>
		</div>
	);
}

function CompareRow({ label, even, children }: { label: string; even: boolean; children: ReactNode }) {
	const bg = even ? "bg-(--sand)/5" : "";
	return (
		<>
			<div className={`flex items-center p-3 text-sm font-medium text-(--muted) ${bg}`}>{label}</div>
			{Children.map(children, (child) => (
				<div className={bg}>{child}</div>
			))}
		</>
	);
}
