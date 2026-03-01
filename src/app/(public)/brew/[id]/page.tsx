import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlavorRadarChart } from "@/components/brew/flavor-radar-chart";
import { MethodRecommendationChips } from "@/components/brew/method-recommendation-chips";
import { WishlistToggleButton } from "@/components/brew/wishlist-toggle-button";
import { ReviewForm } from "@/components/forms/review-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { UserIdentitySummary } from "@/components/user/user-identity-summary";
import { getSessionContext } from "@/lib/auth";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { getServerI18n } from "@/lib/i18n/server";
import { getBrewDetail } from "@/lib/queries";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildHighestBadgeMap, resolveUserDisplayName } from "@/lib/user-identity";
import { formatDate } from "@/lib/utils";

export default async function BrewDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const [{ id }, { locale }, session, supabase] = await Promise.all([
		params,
		getServerI18n(),
		getSessionContext(),
		createSupabaseServerClient(),
	]);
	const { brew, reviews, aggregate } = await getBrewDetail(id);

	if (!brew || (brew.status !== "published" && !session)) {
		notFound();
	}
	const myReview = session ? (reviews.find((review) => review.reviewer_id === session.userId) ?? null) : null;
	const { data: wishlistRow } = session
		? await supabase
				.from("brew_wishlist")
				.select("brew_id")
				.eq("user_id", session.userId)
				.eq("brew_id", brew.id)
				.maybeSingle()
		: { data: null };
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
			overall: Number(
				[
					Number(review.acidity),
					Number(review.sweetness),
					Number(review.body),
					Number(review.aroma),
					Number(review.balance),
				].reduce((acc, value) => acc + value, 0) / 5,
			),
			updated_at: review.updated_at,
			notes: review.notes,
			display_name: reviewerMetaById.get(review.reviewer_id)?.displayName || "Unknown user",
		}));

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<Badge>{brew.status}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{brew.name}</h1>
				<p className="text-[var(--muted)]">
					{locale === "id" ? "Oleh" : "By"} {brew.brewer_name}
				</p>
				<MethodRecommendationChips locale={locale} methods={brew.recommended_methods ?? []} />
				{Array.isArray(brew.tags) && brew.tags.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{brew.tags.map((tag: string) => (
							<span key={`${brew.id}-${tag}`} className="rounded-full border px-2.5 py-1 text-xs text-[var(--muted)]">
								#{tag}
							</span>
						))}
					</div>
				) : null}
				<div className="flex flex-wrap items-center gap-2">
					<Link
						href={`/forum?discussBrewId=${brew.id}`}
						className="inline-flex rounded-full border px-4 py-2 text-sm font-semibold text-(--accent) hover:bg-(--sand)/15"
					>
						{locale === "id" ? "Diskusikan Brew Ini" : "Discuss this brew"}
					</Link>
					{session ? (
						<WishlistToggleButton brewId={brew.id} locale={locale} initialWishlisted={Boolean(wishlistRow)} />
					) : null}
				</div>
			</header>

			<div className="overflow-hidden rounded-3xl border bg-[var(--surface-elevated)]">
				<div className="relative aspect-[16/10] w-full sm:aspect-[16/7]">
					<Image
						src={resolveBrewImageUrl(brew.image_url)}
						alt={brew.image_alt || brew.name}
						fill
						priority
						sizes="100vw"
						className="object-cover"
					/>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Resep" : "Recipe"}</h2>
					<ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
						<li>
							{locale === "id" ? "Metode Seduh" : "Brew Method"}: {brew.brew_method}
						</li>
						<li>
							{locale === "id" ? "Proses Bean" : "Bean Process"}:{" "}
							{brew.bean_process ?? (locale === "id" ? "Tidak diisi" : "Not set")}
						</li>
						<li>
							{locale === "id" ? "Biji Kopi" : "Beans"}: {brew.coffee_beans}
						</li>
						<li>Roastery: {brew.brand_roastery}</li>
						<li>
							{locale === "id" ? "Air" : "Water"}: {brew.water_type} ({brew.water_ppm} ppm)
						</li>
						<li>
							{locale === "id" ? "Suhu" : "Temperature"}: {brew.temperature} {brew.temperature_unit}
						</li>
						<li>
							{locale === "id" ? "Ukuran Giling" : "Grind Size"}: {brew.grind_size}
						</li>
						<li>
							{locale === "id" ? "Klik Grinder" : "Grind Clicks"}: {brew.grind_clicks ?? "N/A"}
						</li>
						<li>
							{locale === "id" ? "Waktu Seduh" : "Brew Time"}: {brew.brew_time_seconds}s
						</li>
						<li>
							{locale === "id" ? "Diperbarui" : "Updated"}: {formatDate(brew.updated_at, locale)}
						</li>
					</ul>
					{brew.notes ? <RichTextContent html={brew.notes} className="mt-4 text-sm" /> : null}
				</Card>

				<Card>
					<h2 className="font-heading text-2xl text-[var(--espresso)]">
						{locale === "id" ? "Ringkasan Rating" : "Rating Snapshot"}
					</h2>
					<p className="mt-2 text-4xl font-bold text-[var(--accent)]">{aggregate.overall.toFixed(2)}</p>
					<p className="text-sm text-[var(--muted)]">
						{aggregate.total} {locale === "id" ? "total review" : "total review(s)"}
					</p>
					<ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
						<li>Acidity: {aggregate.acidity.toFixed(2)}</li>
						<li>Sweetness: {aggregate.sweetness.toFixed(2)}</li>
						<li>Body: {aggregate.body.toFixed(2)}</li>
						<li>Aroma: {aggregate.aroma.toFixed(2)}</li>
						<li>Balance: {aggregate.balance.toFixed(2)}</li>
					</ul>
					<div className="mt-4">
						<FlavorRadarChart
							community={aggregate}
							myReview={myReview}
							labels={[
								locale === "id" ? "Asiditas" : "Acidity",
								locale === "id" ? "Manis" : "Sweetness",
								locale === "id" ? "Body" : "Body",
								locale === "id" ? "Aroma" : "Aroma",
								locale === "id" ? "Balance" : "Balance",
							]}
							communityLabel={locale === "id" ? "Komunitas" : "Community"}
							myReviewLabel={locale === "id" ? "Review Saya" : "My Review"}
						/>
					</div>
				</Card>
			</div>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">
					{locale === "id" ? "Referensi Ukuran Giling" : "Ideal Grind Reference"}
				</h2>
				<div className="overflow-hidden rounded-3xl border bg-[var(--surface-elevated)]">
					<div className="relative aspect-[4/3] w-full sm:aspect-[16/8]">
						<Image
							src={resolveBrewImageUrl(brew.grind_reference_image_url)}
							alt={brew.grind_reference_image_alt || `${brew.name} grind reference`}
							fill
							sizes="100vw"
							className="object-cover"
						/>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">
					{locale === "id" ? "Sightings Terbaru" : "Recent Sightings"}
				</h2>
				<p className="text-sm text-(--muted)">
					{locale === "id"
						? "Member forum yang menyeduh bean ini dalam 30 hari terakhir."
						: "Forum-active members who brewed this bean in the last 30 days."}
				</p>

				{sightings.length === 0 ? (
					<Card>
						<p className="text-sm text-(--muted)">
							{locale === "id"
								? "Belum ada sightings yang cocok dalam 30 hari terakhir."
								: "No qualifying sightings in the last 30 days."}
						</p>
					</Card>
				) : (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{sightings.map((sighting) => (
							<Card key={`${sighting.reviewer_id}-${sighting.updated_at}`}>
								<div className="flex items-center justify-between gap-3">
									<Link href={`/users/${sighting.reviewer_id}`} className="font-semibold text-(--espresso) hover:underline">
										{sighting.display_name}
									</Link>
									<span className="text-xs text-(--muted)">★ {sighting.overall.toFixed(1)}</span>
								</div>
								<p className="mt-1 text-xs text-(--muted)">
									{locale === "id" ? "Terakhir seduh" : "Last brewed"}: {formatDate(sighting.updated_at, locale)}
								</p>
								{sighting.notes ? <p className="mt-2 text-sm text-(--muted)">{clampPlainText(sighting.notes, 180)}</p> : null}
							</Card>
						))}
					</div>
				)}
			</section>

			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">
					{locale === "id" ? "Review Terbaru" : "Recent Reviews"}
				</h2>
				{reviews.map((review) => (
					<Card key={`${review.reviewer_id}-${review.updated_at}`}>
						<UserIdentitySummary
							userId={review.reviewer_id}
							displayName={reviewerMetaById.get(review.reviewer_id)?.displayName || "Unknown user"}
							avatarUrl={reviewerMetaById.get(review.reviewer_id)?.avatarUrl ?? null}
							joinedAt={reviewerMetaById.get(review.reviewer_id)?.joinedAt ?? review.updated_at}
							karma={reviewerMetaById.get(review.reviewer_id)?.karma ?? 0}
							totalReviews={reviewerMetaById.get(review.reviewer_id)?.totalReviews ?? 0}
							isVerified={reviewerMetaById.get(review.reviewer_id)?.isVerified ?? false}
							mentionHandle={reviewerMetaById.get(review.reviewer_id)?.mentionHandle ?? null}
							badges={
								reviewerMetaById.get(review.reviewer_id)?.topBadge
									? [String(reviewerMetaById.get(review.reviewer_id)?.topBadge)]
									: []
							}
							locale={locale}
						/>
						<p className="mt-3 text-sm text-[var(--muted)]">
							Acidity {review.acidity}/5 · Sweetness {review.sweetness}/5 · Body {review.body}/5 · Aroma {review.aroma}
							/5 · Balance {review.balance}/5
						</p>
						{review.notes ? <RichTextContent html={review.notes} className="mt-2 text-sm" /> : null}
						<p className="mt-3 text-xs text-[var(--muted)]">
							{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(review.updated_at, locale)}
						</p>
					</Card>
				))}
			</section>

			{session ? (
				<div className="space-y-3">
					{myReview ? (
						<Card>
							<p className="text-sm text-(--muted)">
								{locale === "id"
									? "Anda sudah memberi review untuk brew ini. Anda dapat memperbarui review yang sama."
									: "You already reviewed this brew. You can update your existing review."}
							</p>
						</Card>
					) : null}
					<ReviewForm brewId={brew.id} initialReview={myReview} />
				</div>
			) : (
				<Card>
					<p className="text-sm text-[var(--muted)]">
						{locale === "id" ? "Masuk untuk memberi review." : "Login to submit a review."}
					</p>
				</Card>
			)}
		</div>
	);
}
