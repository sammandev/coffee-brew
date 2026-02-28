import Image from "next/image";
import Link from "next/link";
import { NewsletterInlineForm } from "@/components/forms/newsletter-inline-form";
import { LandingSectionRenderer } from "@/components/layout/landing-section-renderer";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { resolveLocalizedConfig } from "@/lib/i18n/localize";
import { getServerI18n } from "@/lib/i18n/server";
import { getHomeShowcase, getLandingStats, getVisibleFaqItems, getVisibleLandingSections } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { formatDate } from "@/lib/utils";

export default async function LandingPage() {
	const [{ locale, t }, sections, faqItems, stats, showcase, settings] = await Promise.all([
		getServerI18n(),
		getVisibleLandingSections(),
		getVisibleFaqItems(),
		getLandingStats(),
		getHomeShowcase(),
		getSiteSettings(),
	]);

	const fallbackSections =
		sections.length > 0
			? sections
			: [
					{
						id: "fallback-hero",
						section_type: "hero",
						title: "Brew Better Coffee Every Morning",
						title_id: "Seduh Kopi Lebih Baik Setiap Pagi",
						subtitle: "Track recipes, compare notes, and discover community-approved brew profiles.",
						subtitle_id: "Catat resep, bandingkan catatan, dan temukan profil seduh pilihan komunitas.",
						body: null,
						body_id: null,
						config: {
							ctaText: "Explore Catalog",
							ctaLink: "/catalog",
						},
						config_id: {
							ctaText: "Lihat Katalog",
							ctaLink: "/catalog",
						},
						order_index: 0,
						is_visible: true,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					{
						id: "fallback-features",
						section_type: "feature_grid",
						title: "Precision Tools for Every Cup",
						title_id: "Alat Presisi untuk Setiap Cangkir",
						subtitle: "From water chemistry to grind clicks.",
						subtitle_id: "Dari kimia air hingga klik grinder.",
						body: "Save each variable, rate outcomes, and improve over time.",
						body_id: "Simpan setiap variabel, nilai hasil seduhan, dan tingkatkan kualitas dari waktu ke waktu.",
						config: {
							ctaText: "Create Brew",
							ctaLink: "/me/brews/new",
							assetUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?auto=format&fit=crop&w=1400&q=80",
							assetAlt: "Coffee grinder and beans",
						},
						config_id: {
							ctaText: "Buat Racikan",
							ctaLink: "/me/brews/new",
							assetUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?auto=format&fit=crop&w=1400&q=80",
							assetAlt: "Grinder kopi dan biji kopi",
						},
						order_index: 1,
						is_visible: true,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					{
						id: "fallback-stats",
						section_type: "stats",
						title: "Community Momentum",
						title_id: "Pertumbuhan Komunitas",
						subtitle: null,
						subtitle_id: null,
						body: null,
						body_id: null,
						config: {
							items: [
								{
									label: "Published Brews",
									label_id: "Racikan Dipublikasikan",
									value: `${stats.publishedBrews.toLocaleString("en-US")}+`,
								},
								{
									label: "Forum Threads",
									label_id: "Thread Forum",
									value: `${stats.forumThreads.toLocaleString("en-US")}+`,
								},
								{
									label: "Review Entries",
									label_id: "Entri Review",
									value: `${stats.reviewEntries.toLocaleString("en-US")}+`,
								},
								{ label: "Roasteries", label_id: "Roastery", value: `${stats.roasteries.toLocaleString("en-US")}+` },
							],
						},
						config_id: {},
						order_index: 2,
						is_visible: true,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					{
						id: "fallback-community",
						section_type: "testimonial",
						title: "From Home Brewers to Professionals",
						title_id: "Dari Home Brewer hingga Profesional",
						subtitle: "A community built around better coffee and better feedback.",
						subtitle_id: "Komunitas yang dibangun untuk seduhan dan umpan balik yang lebih baik.",
						body: "Discuss methods in the forum, publish recipes in the catalog, and iterate faster with rating data.",
						body_id: "Diskusikan metode di forum, publikasikan resep di katalog, dan iterasi lebih cepat dengan data rating.",
						config: {
							ctaText: "Join the Forum",
							ctaLink: "/forum",
							assetUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1400&q=80",
							assetAlt: "Barista and coffee cup",
						},
						config_id: {
							ctaText: "Gabung Forum",
							ctaLink: "/forum",
							assetUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1400&q=80",
							assetAlt: "Barista dan cangkir kopi",
						},
						order_index: 3,
						is_visible: true,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
				];

	const dynamicStatItems = [
		{
			label: "Published Brews",
			label_id: "Racikan Dipublikasikan",
			value: `${stats.publishedBrews.toLocaleString("en-US")}+`,
		},
		{ label: "Forum Threads", label_id: "Thread Forum", value: `${stats.forumThreads.toLocaleString("en-US")}+` },
		{ label: "Review Entries", label_id: "Entri Review", value: `${stats.reviewEntries.toLocaleString("en-US")}+` },
		{ label: "Roasteries", label_id: "Roastery", value: `${stats.roasteries.toLocaleString("en-US")}+` },
	];

	const landingSections = fallbackSections.map((section) => {
		if (section.section_type !== "stats") {
			return section;
		}

		return {
			...section,
			config: {
				...(section.config ?? {}),
				items: dynamicStatItems,
			},
		};
	});

	const prioritizedImageSectionId =
		landingSections.find((section) => {
			const config = resolveLocalizedConfig(locale, section.config, section.config_id);
			return typeof config.assetUrl === "string" && config.assetUrl.trim().length > 0;
		})?.id ?? null;

	return (
		<div className="space-y-8">
			{(settings.home_title_en || settings.home_title_id || settings.home_subtitle_en || settings.home_subtitle_id) && (
				<section className="rounded-3xl border bg-(--surface-elevated) p-6 sm:p-8">
					<h1 className="font-heading text-4xl text-(--espresso)">
						{locale === "id"
							? (settings.home_title_id ?? settings.home_title_en)
							: (settings.home_title_en ?? settings.home_title_id)}
					</h1>
					{(settings.home_subtitle_en || settings.home_subtitle_id) && (
						<p className="mt-3 text-(--muted)">
							{locale === "id"
								? (settings.home_subtitle_id ?? settings.home_subtitle_en)
								: (settings.home_subtitle_en ?? settings.home_subtitle_id)}
						</p>
					)}
				</section>
			)}

			<div className="space-y-6">
				{landingSections.map((section, index) => (
					<div className="fade-up" style={{ animationDelay: `${index * 100}ms` }} key={section.id}>
						<LandingSectionRenderer section={section} locale={locale} eagerImage={section.id === prioritizedImageSectionId} />
					</div>
				))}
			</div>

			<section className="rounded-3xl border bg-(--surface-elevated) p-6 sm:p-8">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="font-heading text-3xl text-(--espresso)">
							{locale === "id" ? "Pilihan Katalog dan Review Terbaru" : "Featured Catalog Brews and Recent Reviews"}
						</h2>
						<p className="mt-2 text-(--muted)">
							{locale === "id"
								? "Data ini diambil langsung dari racikan publik dan ulasan terbaru."
								: "This data is pulled directly from published brews and recent review entries."}
						</p>
					</div>
					<Link href="/catalog" className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/20">
						{locale === "id" ? "Lihat Semua Katalog" : "View Full Catalog"}
					</Link>
				</div>

				<div className="mt-6 grid gap-6 lg:grid-cols-2">
					<div className="space-y-3">
						<h3 className="font-heading text-xl text-(--espresso)">
							{locale === "id" ? "Racikan Unggulan" : "Featured Brews"}
						</h3>
						<div className="space-y-3">
							{showcase.featuredBrews.slice(0, 5).map((brew) => (
								<Link key={brew.id} href={`/brew/${brew.id}`} className="block rounded-2xl border bg-(--surface) p-4">
									<div className="flex items-start gap-3">
										<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border">
											<Image
												src={resolveBrewImageUrl(brew.image_url)}
												alt={brew.image_alt || brew.name}
												fill
												sizes="64px"
												className="object-cover"
											/>
										</div>
										<div className="min-w-0">
											<p className="truncate font-semibold text-(--espresso)">{brew.name}</p>
											<p className="mt-1 text-sm text-(--muted)">
												{brew.brew_method} · {brew.brand_roastery}
											</p>
										</div>
									</div>
									<p className="mt-3 text-xs text-(--muted)">
										{brew.review_total > 0
											? `${brew.rating_avg.toFixed(2)} / 5 (${brew.review_total})`
											: locale === "id"
												? "Belum ada review"
												: "No reviews yet"}
									</p>
								</Link>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<h3 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Catatan Review" : "Review Notes"}</h3>
						<div className="space-y-3">
							{showcase.recentReviews.slice(0, 5).map((review) => (
								<div key={review.id} className="rounded-2xl border bg-(--surface) p-4">
									<p className="text-sm font-semibold text-(--espresso)">{review.brew_name}</p>
									<p className="mt-1 text-xs text-(--muted)">{review.overall.toFixed(2)} / 5</p>
									{review.notes ? (
										<RichTextContent html={review.notes} className="mt-2 line-clamp-3 text-sm" />
									) : (
										<p className="mt-2 line-clamp-3 text-sm text-(--foreground)/90">
											{locale === "id" ? "Tanpa catatan tambahan." : "No additional notes."}
										</p>
									)}
									<p className="mt-2 text-xs text-(--muted)">{formatDate(review.updated_at, locale)}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="rounded-3xl border bg-(--surface-elevated) p-6 sm:p-8">
				<h2 className="font-heading text-3xl text-(--espresso)">{t("landing.faqTitle")}</h2>
				<p className="mt-2 max-w-2xl text-(--muted)">{t("landing.faqDesc")}</p>
				<div className="mt-5 space-y-3">
					{faqItems.map((item) => (
						<details key={item.id} className="rounded-2xl border bg-(--surface) p-4">
							<summary className="cursor-pointer font-semibold text-(--espresso)">
								{locale === "id" ? item.question_id : item.question_en}
							</summary>
							<p className="mt-3 text-sm text-(--muted)">{locale === "id" ? item.answer_id : item.answer_en}</p>
						</details>
					))}
				</div>
				<Link href="/contact" className="mt-4 inline-flex text-sm font-semibold text-(--accent) underline">
					{t("landing.moreHelp")}
				</Link>
			</section>

			<section className="rounded-3xl border bg-(--surface-elevated) p-6 sm:p-8">
				<h2 className="font-heading text-3xl text-(--espresso)">{t("landing.newsletterTitle")}</h2>
				<p className="mt-2 max-w-2xl text-(--muted)">{t("landing.newsletterDesc")}</p>
				<div className="mt-5 max-w-xl">
					<NewsletterInlineForm />
				</div>
			</section>
		</div>
	);
}
