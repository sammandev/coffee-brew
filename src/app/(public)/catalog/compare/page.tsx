import Image from "next/image";
import Link from "next/link";
import { FlavorRadarChart } from "@/components/brew/flavor-radar-chart";
import { MethodRecommendationChips } from "@/components/brew/method-recommendation-chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { parseCompareIds } from "@/lib/brew-collections";
import { resolveBrewImageUrl } from "@/lib/brew-images";
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

	if (ids.length < 2) {
		return (
			<div className="space-y-6">
				<header className="space-y-2">
					<Badge>{locale === "id" ? "Bandingkan Brew" : "Brew Compare"}</Badge>
					<h1 className="font-heading text-4xl text-(--espresso)">
						{locale === "id" ? "Bandingkan Brew" : "Compare Brews"}
					</h1>
					<p className="text-(--muted)">
						{locale === "id"
							? "Pilih minimal dua brew dari katalog untuk melihat perbandingan detail."
							: "Choose at least two brews from the catalog to see a side-by-side comparison."}
					</p>
				</header>
				<Card>
					<CardTitle>{locale === "id" ? "Belum cukup brew" : "Not enough brews selected"}</CardTitle>
					<CardDescription className="mt-2">
						{locale === "id"
							? "Tambahkan 2-3 brew ke compare tray di halaman katalog."
							: "Add 2-3 brews to the compare tray from the catalog page."}
					</CardDescription>
					<Link href="/catalog" className="mt-4 inline-block text-sm font-semibold text-(--accent) underline">
						{locale === "id" ? "Kembali ke katalog" : "Back to catalog"}
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

	const { data: reviewRows } =
		orderedBrews.length > 0
			? await supabase
					.from("brew_reviews")
					.select("brew_id, reviewer_id, acidity, sweetness, body, aroma, balance, overall, updated_at")
					.in(
						"brew_id",
						orderedBrews.map((brew) => brew.id),
					)
			: { data: [] as Array<Record<string, unknown>> };

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

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{locale === "id" ? "Bandingkan Brew" : "Brew Compare"}</Badge>
				<h1 className="font-heading text-4xl text-(--espresso)">
					{locale === "id" ? "Perbandingan Brew" : "Brew Comparison"}
				</h1>
				<p className="text-(--muted)">
					{locale === "id"
						? "Lihat flavor balance, metode rekomendasi, dan detail proses secara berdampingan."
						: "Review flavor balance, recommended methods, and processing details side by side."}
				</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
				{orderedBrews.map((brew) => {
					const aggregate = aggregateRatings(reviewMap.get(brew.id) ?? []);
					const myReview = myReviewMap.get(brew.id) ?? null;
					return (
						<Card key={brew.id} className="space-y-3">
							<div className="relative aspect-[16/10] overflow-hidden rounded-2xl border">
								<Image
									src={resolveBrewImageUrl(brew.image_url)}
									alt={brew.image_alt || brew.name}
									fill
									sizes="(max-width: 1280px) 100vw, 33vw"
									className="object-cover"
								/>
							</div>

							<div>
								<CardTitle>{brew.name}</CardTitle>
								<CardDescription className="mt-1">{brew.brew_method}</CardDescription>
							</div>

							<MethodRecommendationChips locale={locale} methods={brew.recommended_methods ?? []} />

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

							<ul className="space-y-1.5 break-words text-sm text-(--muted)">
								<li>Beans: {brew.coffee_beans}</li>
								<li>Roastery: {brew.brand_roastery}</li>
								<li>Brewer: {brew.brewer_name}</li>
								<li>
									{locale === "id" ? "Proses" : "Process"}:{" "}
									{brew.bean_process ?? (locale === "id" ? "Tidak diisi" : "Not specified")}
								</li>
								<li>
									Water: {brew.water_type} ({brew.water_ppm} ppm)
								</li>
								<li>
									{locale === "id" ? "Suhu" : "Temperature"}: {brew.temperature} {brew.temperature_unit}
								</li>
								<li>
									{locale === "id" ? "Grind" : "Grind"}: {brew.grind_size}
									{typeof brew.grind_clicks === "number" ? ` (${brew.grind_clicks} clicks)` : ""}
								</li>
								<li>
									{locale === "id" ? "Waktu Seduh" : "Brew Time"}: {brew.brew_time_seconds}s
								</li>
								<li>
									{locale === "id" ? "Diperbarui" : "Updated"}: {formatDate(brew.updated_at, locale)}
								</li>
							</ul>

							<div className="grid gap-2">
								<p className="text-sm font-semibold text-(--espresso)">
									{locale === "id" ? "Referensi Ukuran Giling" : "Ideal Grind Reference"}
								</p>
								<div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-(--surface) sm:aspect-[16/9]">
									<Image
										src={resolveBrewImageUrl(brew.grind_reference_image_url)}
										alt={brew.grind_reference_image_alt || `${brew.name} grind reference`}
										fill
										sizes="(max-width: 1280px) 100vw, 33vw"
										className="object-cover"
									/>
								</div>
							</div>

							<Link href={`/brew/${brew.id}`} className="text-sm font-semibold text-(--accent) underline">
								{locale === "id" ? "Buka detail brew" : "Open brew detail"}
							</Link>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
