import Image from "next/image";
import { notFound } from "next/navigation";
import { ReviewForm } from "@/components/forms/review-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getSessionContext } from "@/lib/auth";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { getServerI18n } from "@/lib/i18n/server";
import { getBrewDetail } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function BrewDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const [{ id }, { locale }] = await Promise.all([params, getServerI18n()]);
	const [{ brew, reviews, aggregate }, session] = await Promise.all([getBrewDetail(id), getSessionContext()]);

	if (!brew || (brew.status !== "published" && !session)) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<Badge>{brew.status}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{brew.name}</h1>
				<p className="text-[var(--muted)]">
					{locale === "id" ? "Oleh" : "By"} {brew.brewer_name}
				</p>
				{Array.isArray(brew.tags) && brew.tags.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{brew.tags.map((tag: string) => (
							<span key={`${brew.id}-${tag}`} className="rounded-full border px-2.5 py-1 text-xs text-[var(--muted)]">
								#{tag}
							</span>
						))}
					</div>
				) : null}
			</header>

			<div className="overflow-hidden rounded-3xl border bg-[var(--surface-elevated)]">
				<div className="relative aspect-[16/7] w-full">
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

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Resep" : "Recipe"}</h2>
					<ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
						<li>
							{locale === "id" ? "Metode Seduh" : "Brew Method"}: {brew.brew_method}
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
				</Card>
			</div>

			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">
					{locale === "id" ? "Review Terbaru" : "Recent Reviews"}
				</h2>
				{reviews.map((review) => (
					<Card key={`${review.reviewer_id}-${review.updated_at}`}>
						<p className="text-sm text-[var(--muted)]">
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
				<ReviewForm brewId={brew.id} />
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
