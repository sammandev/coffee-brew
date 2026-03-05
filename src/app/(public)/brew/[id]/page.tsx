import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrewReviewsLiveRefresh } from "@/components/brew/brew-reviews-live-refresh";
import { MethodRecommendationChips } from "@/components/brew/method-recommendation-chips";
import { RecentReviewsSection } from "@/components/brew/recent-reviews-section";
import { WishlistToggleButton } from "@/components/brew/wishlist-toggle-button";
import { ReviewForm } from "@/components/forms/review-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getSessionContext } from "@/lib/auth";
import { canAccessBrew, canReadUnpublishedBrew } from "@/lib/brew-access";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { getDimensionLabels, getMessage, getStatusBadgeProps } from "@/lib/i18n/messages";
import { getServerI18n } from "@/lib/i18n/server";
import { getBrewDetail } from "@/lib/queries";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildHighestBadgeMap, resolveUserDisplayName } from "@/lib/user-identity";
import { formatDate } from "@/lib/utils";

const FlavorRadarChart = dynamic(() =>
	import("@/components/brew/flavor-radar-chart").then((mod) => mod.FlavorRadarChart),
);

export default async function BrewDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const [{ id }, { locale }] = await Promise.all([params, getServerI18n()]);
	const [session, supabase] = await Promise.all([getSessionContext(), createSupabaseServerClient()]);
	const canReadUnpublished = canReadUnpublishedBrew(session?.role);
	const detail = await getBrewDetail(id, { includeUnpublished: canReadUnpublished });
	const { brew, reviews, aggregate } = detail;

	if (!brew || !canAccessBrew(brew.status, session?.role)) {
		notFound();
	}
	const myReview = session ? (reviews.find((review) => review.reviewer_id === session.userId) ?? null) : null;
	const [{ data: wishlistRow }, { data: wishlistCountRows }] = await Promise.all([
		session
			? supabase.from("brew_wishlist").select("brew_id").eq("user_id", session.userId).eq("brew_id", brew.id).maybeSingle()
			: Promise.resolve({ data: null }),
		supabase.rpc("get_brew_wishlist_counts", { brew_ids: [brew.id] }),
	]);
	const wishlistCount = Number((wishlistCountRows ?? [])[0]?.wishlist_count ?? 0);
	const reviewerIds = Array.from(new Set(reviews.map((review) => review.reviewer_id)));
	const [{ data: reviewerProfiles }, { data: reviewerReviewRows }, { data: reviewerBadges }] =
		reviewerIds.length > 0
			? await Promise.all([
					supabase
						.from("profiles")
						.select("id, display_name, email, avatar_url, created_at, karma_points, is_verified, mention_handle")
						.in("id", reviewerIds),
					supabase.from("brew_reviews").select("reviewer_id").in("reviewer_id", reviewerIds).limit(5000),
					supabase
						.from("user_badges")
						.select("user_id, badge_definitions(label_en, label_id, min_points)")
						.in("user_id", reviewerIds),
				])
			: [
					{
						data: [] as Array<{
							id: string;
							display_name: string | null;
							email: string | null;
							avatar_url: string | null;
							created_at: string;
							karma_points: number | null;
							is_verified: boolean;
							mention_handle: string | null;
						}>,
					},
					{
						data: [] as Array<{ reviewer_id: string }>,
					},
					{
						data: [] as Array<{
							user_id: string;
							badge_definitions: { label_en: string; label_id: string; min_points: number } | null;
						}>,
					},
				];
	const reviewerCountMap = new Map<string, number>();
	for (const row of reviewerReviewRows ?? []) {
		reviewerCountMap.set(row.reviewer_id, (reviewerCountMap.get(row.reviewer_id) ?? 0) + 1);
	}
	const topBadgeByUserId = buildHighestBadgeMap(reviewerBadges ?? [], locale);
	const reviewerMetaById = new Map(
		(reviewerProfiles ?? []).map((profile) => [
			profile.id,
			{
				avatarUrl: profile.avatar_url,
				displayName: resolveUserDisplayName(profile),
				joinedAt: profile.created_at,
				karma: Number(profile.karma_points ?? 0),
				isVerified: Boolean(profile.is_verified),
				mentionHandle: profile.mention_handle,
				topBadge: topBadgeByUserId.get(profile.id) ?? null,
				totalReviews: reviewerCountMap.get(profile.id) ?? 0,
			},
		]),
	);

	const recentWindowStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
	const recentReviews = reviews.filter((review) => new Date(review.updated_at).getTime() >= recentWindowStart);
	const recentReviewerIds = Array.from(new Set(recentReviews.map((review) => review.reviewer_id)));

	const [threadActivityRows, commentActivityRows] =
		recentReviewerIds.length > 0
			? await Promise.all([
					supabase.from("forum_threads").select("author_id").in("author_id", recentReviewerIds).limit(500),
					supabase.from("forum_comments").select("author_id").in("author_id", recentReviewerIds).limit(500),
				])
			: [{ data: [] as Array<{ author_id: string }> }, { data: [] as Array<{ author_id: string }> }];
	const forumActiveUserIds = new Set(
		[...(threadActivityRows.data ?? []), ...(commentActivityRows.data ?? [])].map((row) => row.author_id),
	);
	const sightings = recentReviews
		.filter((review) => forumActiveUserIds.has(review.reviewer_id))
		.slice(0, 10)
		.map((review) => ({
			reviewer_id: review.reviewer_id,
			star_rating: review.star_rating ?? null,
			updated_at: review.updated_at,
			notes: review.notes,
			display_name: reviewerMetaById.get(review.reviewer_id)?.displayName || "Unknown user",
		}));

	const m = (key: Parameters<typeof getMessage>[1]) => getMessage(locale, key);

	const RECIPE_ROWS = [
		{ label: m("brew.brewMethod"), value: brew.brew_method },
		{ label: m("brew.beanProcess"), value: brew.bean_process ?? m("brew.notSet") },
		{ label: m("brew.beans"), value: brew.coffee_beans },
		{ label: m("brew.roastery"), value: brew.brand_roastery },
		{ label: m("brew.water"), value: `${brew.water_type} (${brew.water_ppm} ppm)` },
		{ label: m("brew.temperature"), value: `${brew.temperature} ${brew.temperature_unit}` },
		{ label: m("brew.grindSize"), value: brew.grind_size },
		{ label: m("brew.grindClicks"), value: brew.grind_clicks ?? "N/A" },
		{ label: m("brew.brewTime"), value: `${brew.brew_time_seconds}s` },
		{ label: m("brew.updated"), value: formatDate(brew.updated_at, locale) },
	];

	const DIMENSION_LABELS = getDimensionLabels(locale);
	const reviewCards = reviews.map((review) => {
		const meta = reviewerMetaById.get(review.reviewer_id);
		return {
			acidity: review.acidity,
			aroma: review.aroma,
			balance: review.balance,
			body: review.body,
			notes: review.notes,
			reviewer: {
				avatarUrl: meta?.avatarUrl ?? null,
				badge: meta?.topBadge ? String(meta.topBadge) : null,
				displayName: meta?.displayName || "Unknown user",
				joinedAt: meta?.joinedAt ?? review.updated_at,
				karma: meta?.karma ?? 0,
				mentionHandle: meta?.mentionHandle ?? null,
				totalReviews: meta?.totalReviews ?? 0,
				userId: review.reviewer_id,
			},
			reviewer_id: review.reviewer_id,
			star_rating: review.star_rating,
			sweetness: review.sweetness,
			updated_at: review.updated_at,
		};
	});

	return (
		<div className="space-y-8">
			<BrewReviewsLiveRefresh brewId={brew.id} />

			{/* Breadcrumb */}
			<nav aria-label="Breadcrumb" className="text-sm text-(--muted)">
				<ol className="flex items-center gap-1.5">
					<li>
						<Link href="/catalog" className="transition hover:text-(--espresso)">
							{m("brew.backToCatalog")}
						</Link>
					</li>
					<li aria-hidden="true" className="select-none">
						/
					</li>
					<li className="truncate font-medium text-(--espresso)">{brew.name}</li>
				</ol>
			</nav>

			{/* Hero: image + header side-by-side on desktop */}
			<div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
				{/* Image */}
				<div className="group overflow-hidden rounded-3xl border bg-(--surface-elevated)">
					<div className="relative aspect-16/10 w-full overflow-hidden sm:aspect-4/3">
						<Image
							src={resolveBrewImageUrl(brew.image_url)}
							alt={brew.image_alt || brew.name}
							fill
							priority
							sizes="(max-width: 1024px) 100vw, 50vw"
							className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
						/>
						<span className="absolute top-4 left-4 z-10 rounded-full bg-(--surface-elevated)/90 px-3 py-1 text-xs font-semibold text-(--espresso) shadow-sm backdrop-blur-sm">
							{brew.brew_method}
						</span>
					</div>
				</div>

				{/* Header info */}
				<div className="flex flex-col gap-4">
					<div className="space-y-2">
						{(() => {
							const { label, className } = getStatusBadgeProps(brew.status, locale);
							return <Badge className={className}>{label}</Badge>;
						})()}
						<h1 className="font-heading text-3xl leading-tight text-(--espresso) lg:text-4xl">{brew.name}</h1>
						<p className="text-(--muted)">
							{m("brew.by")} <span className="font-medium text-(--espresso)">{brew.brewer_name}</span>
						</p>
					</div>

					<div className="inline-flex items-center gap-1.5 text-sm text-(--muted)">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill={wishlistCount > 0 ? "var(--danger)" : "none"}
							stroke={wishlistCount > 0 ? "var(--danger)" : "var(--sand)"}
							strokeWidth="2"
							className="shrink-0"
							aria-hidden="true"
							focusable="false"
						>
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
						</svg>
						<span title={`${wishlistCount} ${m("catalog.favorites")}`}>
							{wishlistCount} {m("catalog.favorites")}
						</span>
					</div>

					<MethodRecommendationChips locale={locale} methods={brew.recommended_methods ?? []} />

					{Array.isArray(brew.tags) && brew.tags.length > 0 ? (
						<div className="flex flex-wrap gap-1.5">
							{brew.tags.map((tag: string) => (
								<Link
									key={`${brew.id}-${tag}`}
									href={`/catalog?tag=${encodeURIComponent(tag)}`}
									className="rounded-full bg-(--sand)/15 px-2.5 py-1 text-xs font-medium text-(--muted) transition hover:bg-(--sand)/30"
								>
									#{tag}
								</Link>
							))}
						</div>
					) : null}

					{/* Actions */}
					<div className="flex flex-wrap items-center gap-2 pt-1">
						<Link
							href={`/forum?discussBrewId=${brew.id}`}
							className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-(--accent) transition hover:bg-(--sand)/15"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
								focusable="false"
							>
								<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
							</svg>
							{m("brew.discuss")}
						</Link>
						{session ? (
							<WishlistToggleButton brewId={brew.id} locale={locale} initialWishlisted={Boolean(wishlistRow)} />
						) : null}
					</div>
				</div>
			</div>

			{/* Recipe + Rating cards */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Recipe card */}
				<Card className="p-0">
					<div className="border-b px-6 py-4">
						<h2 className="font-heading text-xl text-(--espresso)">{m("brew.recipe")}</h2>
					</div>
					<div className="divide-y">
						{RECIPE_ROWS.map((row) => (
							<div key={row.label} className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
								<span className="text-(--muted)">{row.label}</span>
								<span className="text-right font-medium text-(--espresso)">{row.value}</span>
							</div>
						))}
					</div>
					{brew.notes ? (
						<div className="border-t px-6 py-4">
							<RichTextContent html={brew.notes} className="text-sm" />
						</div>
					) : null}
				</Card>

				{/* Rating snapshot card */}
				<Card className="p-0">
					<div className="border-b px-6 py-4">
						<h2 className="font-heading text-xl text-(--espresso)">{m("brew.flavorSnapshot")}</h2>
					</div>
					<div className="space-y-4 px-6 py-5">
						{/* Dimension bars */}
						<div className="space-y-3">
							{DIMENSION_LABELS.map(({ key, label }) => {
								const value = Number(aggregate[key]) || 0;
								const pct = Math.min(100, (value / 5) * 100);
								return (
									<div key={key} className="space-y-1">
										<div className="flex items-center justify-between text-sm">
											<span className="text-(--muted)">{label}</span>
											<span className="font-semibold text-(--espresso)">{value.toFixed(1)}</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-(--sand)/20">
											<div className="h-full rounded-full bg-(--crema) transition-all" style={{ width: `${pct}%` }} />
										</div>
									</div>
								);
							})}
						</div>

						{/* Flavor radar chart */}
						<div className="pt-2">
							<p className="mb-1 text-center text-xs font-medium text-(--muted)">{m("brew.communityAvg")}</p>
							<FlavorRadarChart
								community={aggregate}
								myReview={myReview}
								labels={DIMENSION_LABELS.map(({ label }) => label) as [string, string, string, string, string]}
								communityLabel={locale === "id" ? "Komunitas" : "Community"}
								myReviewLabel={locale === "id" ? "Review Saya" : "My Review"}
								size={220}
							/>
						</div>
					</div>
				</Card>
			</div>

			{/* Recent Sightings */}
			<section className="space-y-4">
				<div className="space-y-1">
					<h2 className="font-heading text-2xl text-(--espresso)">{m("brew.recentSightings")}</h2>
					<p className="text-sm text-(--muted)">{m("brew.sightingsDescription")}</p>
				</div>

				{sightings.length === 0 ? (
					<Card>
						<p className="text-sm text-(--muted)">{m("brew.noSightings")}</p>
					</Card>
				) : (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{sightings.map((sighting) => (
							<Card key={`${sighting.reviewer_id}-${sighting.updated_at}`} className="transition-shadow hover:shadow-md">
								<div className="flex items-center justify-between gap-3">
									<Link href={`/users/${sighting.reviewer_id}`} className="font-semibold text-(--espresso) hover:underline">
										{sighting.display_name}
									</Link>
									{sighting.star_rating != null ? (
										<span className="inline-flex items-center gap-1 rounded-full bg-(--crema)/15 px-2 py-0.5 text-xs font-semibold text-(--accent)">
											<svg
												width="12"
												height="12"
												viewBox="0 0 24 24"
												fill="var(--crema)"
												stroke="var(--crema)"
												strokeWidth="2"
												aria-hidden="true"
												focusable="false"
											>
												<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
											</svg>
											{sighting.star_rating.toFixed(1)}
										</span>
									) : null}
								</div>
								<p className="mt-1 text-xs text-(--muted)">
									{m("brew.lastBrewed")}: {formatDate(sighting.updated_at, locale)}
								</p>
								{sighting.notes ? (
									<p className="mt-2 line-clamp-3 text-sm text-(--muted)">{clampPlainText(sighting.notes, 180)}</p>
								) : null}
							</Card>
						))}
					</div>
				)}
			</section>

			<RecentReviewsSection aggregate={aggregate} locale={locale} reviews={reviewCards} />

			{/* Review form */}
			{session ? (
				<div className="space-y-3">
					{myReview ? (
						<Card>
							<p className="text-sm text-(--muted)">{m("brew.alreadyReviewed")}</p>
						</Card>
					) : null}
					<ReviewForm brewId={brew.id} initialReview={myReview} />
				</div>
			) : (
				<Card>
					<p className="text-sm text-(--muted)">{m("brew.loginToReview")}</p>
				</Card>
			)}
		</div>
	);
}
