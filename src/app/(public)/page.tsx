import Image from "next/image";
import Link from "next/link";
import { NewsletterInlineForm } from "@/components/forms/newsletter-inline-form";
import { LandingSectionRenderer } from "@/components/layout/landing-section-renderer";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { resolveLocalizedConfig } from "@/lib/i18n/localize";
import { getServerI18n } from "@/lib/i18n/server";
import { getHomeShowcase, getLandingStats, getVisibleFaqItems, getVisibleLandingSections } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";

/* ─── Star rating helper ─── */
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
	return (
		<span className="inline-flex gap-px" aria-label={`${value.toFixed(1)} out of ${max}`}>
			{Array.from({ length: max }, (_, i) => {
				const fill = Math.min(1, Math.max(0, value - i));
				return (
					<svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
						<defs>
							<linearGradient id={`star-fill-home-${i}-${value.toFixed(1)}`}>
								<stop offset={`${fill * 100}%`} stopColor="var(--crema)" />
								<stop offset={`${fill * 100}%`} stopColor="var(--sand)" stopOpacity="0.35" />
							</linearGradient>
						</defs>
						<path
							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
							fill={`url(#star-fill-home-${i}-${value.toFixed(1)})`}
						/>
					</svg>
				);
			})}
		</span>
	);
}

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

	const prioritizedImageSectionIds = landingSections
		.filter((section) => {
			const config = resolveLocalizedConfig(locale, section.config, section.config_id);
			return typeof config.assetUrl === "string" && config.assetUrl.trim().length > 0;
		})
		.slice(0, 3)
		.map((section) => section.id);

	return (
		<div className="space-y-10">
			{/* ─── Optional Site Title ─── */}
			{(settings.home_title_en || settings.home_title_id || settings.home_subtitle_en || settings.home_subtitle_id) && (
				<section className="rounded-3xl border border-(--sand)/30 bg-(--surface-elevated) p-6 sm:p-8">
					<h1 className="font-heading text-4xl tracking-tight text-(--espresso)">
						{locale === "id"
							? (settings.home_title_id ?? settings.home_title_en)
							: (settings.home_title_en ?? settings.home_title_id)}
					</h1>
					{(settings.home_subtitle_en || settings.home_subtitle_id) && (
						<p className="mt-3 text-lg text-(--muted)">
							{locale === "id"
								? (settings.home_subtitle_id ?? settings.home_subtitle_en)
								: (settings.home_subtitle_en ?? settings.home_subtitle_id)}
						</p>
					)}
				</section>
			)}

			{/* ─── Dynamic Landing Sections ─── */}
			<div className="space-y-8">
				{landingSections.map((section, index) => (
					<div className="fade-up" style={{ animationDelay: `${index * 80}ms` }} key={section.id}>
						<LandingSectionRenderer
							section={section}
							locale={locale}
							eagerImage={prioritizedImageSectionIds.includes(section.id)}
						/>
					</div>
				))}
			</div>

			{/* ─── Why Coffee Brew Lab ─── */}
			<section
				className="fade-up rounded-3xl border border-(--sand)/30 bg-(--surface-elevated) p-6 sm:p-10"
				style={{ animationDelay: "200ms" }}
			>
				<h2 className="text-center font-heading text-3xl tracking-tight text-(--espresso) sm:text-4xl">
					{t("landing.whyTitle")}
				</h2>
				<div className="mt-8 grid gap-6 sm:grid-cols-3">
					{(
						[
							{ icon: "precision", title: t("landing.whyPrecision"), desc: t("landing.whyPrecisionDesc") },
							{ icon: "community", title: t("landing.whyCommunity"), desc: t("landing.whyCommunityDesc") },
							{ icon: "open", title: t("landing.whyOpen"), desc: t("landing.whyOpenDesc") },
						] as const
					).map((item) => (
						<div
							key={item.icon}
							className="group rounded-2xl border border-(--sand)/25 bg-(--surface) p-6 text-center transition hover:border-(--accent)/30 hover:shadow-md"
						>
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-(--accent)/10 text-(--accent) transition group-hover:bg-(--accent)/15">
								{item.icon === "precision" && (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="10" />
										<path d="M12 6v6l4 2" />
									</svg>
								)}
								{item.icon === "community" && (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
										<circle cx="9" cy="7" r="4" />
										<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
										<path d="M16 3.13a4 4 0 0 1 0 7.75" />
									</svg>
								)}
								{item.icon === "open" && (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
										<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
									</svg>
								)}
							</div>
							<h3 className="mt-4 font-heading text-lg text-(--espresso)">{item.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-(--muted)">{item.desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* ─── Featured Brew Catalog ─── */}
			<section
				className="fade-up overflow-hidden rounded-3xl border border-(--sand)/30 bg-(--surface-elevated)"
				style={{ animationDelay: "280ms" }}
			>
				<div className="flex flex-wrap items-end justify-between gap-4 border-b border-(--sand)/20 px-6 py-6 sm:px-8">
					<div>
						<h2 className="font-heading text-3xl tracking-tight text-(--espresso)">{t("landing.featuredTitle")}</h2>
						<p className="mt-1 text-(--muted)">{t("landing.featuredDesc")}</p>
					</div>
					<Link
						href="/catalog"
						className="inline-flex items-center gap-2 rounded-full border border-(--accent)/50 px-5 py-2 text-sm font-semibold text-(--accent) transition hover:bg-(--accent) hover:text-(--surface-elevated)"
					>
						{t("landing.viewCatalog")}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12h14" />
							<path d="m12 5 7 7-7 7" />
						</svg>
					</Link>
				</div>

				<div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
					{/* Featured Brews (left column) */}
					<div className="border-b border-(--sand)/20 p-6 sm:p-8 xl:border-b-0 xl:border-r">
						<h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-(--muted)">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
							</svg>
							{t("landing.featuredBrews")}
						</h3>
						<div className="space-y-3">
							{showcase.featuredBrews.slice(0, 5).map((brew) => (
								<Link
									key={brew.id}
									href={`/brew/${brew.id}`}
									className="group/card flex items-start gap-4 rounded-2xl border border-(--sand)/20 bg-(--surface) p-4 transition hover:border-(--accent)/25 hover:shadow-sm"
								>
									<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-(--sand)/30">
										<Image
											src={resolveBrewImageUrl(brew.image_url)}
											alt={brew.image_alt || brew.name}
											fill
											sizes="64px"
											className="object-cover transition-transform duration-300 group-hover/card:scale-110"
										/>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate font-semibold text-(--espresso) transition group-hover/card:text-(--accent)">
											{brew.name}
										</p>
										<p className="mt-0.5 text-sm text-(--muted)">
											{brew.brew_method} · {brew.brand_roastery}
										</p>
										<div className="mt-2 flex items-center gap-2">
											{brew.review_total > 0 ? (
												<>
													<StarRating value={brew.rating_avg} />
													<span className="text-xs text-(--muted)">
														{brew.rating_avg.toFixed(1)} · {brew.review_total} {t("landing.reviews")}
													</span>
												</>
											) : (
												<span className="text-xs text-(--muted)">{t("landing.noReviews")}</span>
											)}
										</div>
									</div>
								</Link>
							))}
						</div>
					</div>

					{/* Top Rated Brews (right column) */}
					<div className="p-6 sm:p-8">
						<h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-(--muted)">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
							</svg>
							{t("landing.topRated")}
						</h3>
						<div className="space-y-3">
							{showcase.topRatedBrews.slice(0, 5).map((brew, index) => (
								<Link
									key={brew.id}
									href={`/brew/${brew.id}`}
									className="group/card flex items-center gap-4 rounded-2xl border border-(--sand)/20 bg-(--surface) p-4 transition hover:border-(--accent)/25 hover:shadow-sm"
								>
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent)/10 text-sm font-bold text-(--accent)">
										{index + 1}
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold text-(--espresso) transition group-hover/card:text-(--accent)">
											{brew.name}
										</p>
										<p className="text-xs text-(--muted)">
											{brew.brew_method} · {brew.brand_roastery}
										</p>
										<div className="mt-1.5 flex items-center gap-2">
											{brew.review_total > 0 ? (
												<>
													<StarRating value={brew.rating_avg} />
													<span className="text-xs text-(--muted)">
														{brew.rating_avg.toFixed(1)} · {brew.review_total} {t("landing.reviews")}
													</span>
												</>
											) : (
												<span className="text-xs text-(--muted)">{t("landing.noReviews")}</span>
											)}
										</div>
									</div>
								</Link>
							))}
							{showcase.topRatedBrews.length === 0 && (
								<div className="rounded-2xl border border-dashed border-(--sand)/40 p-5 text-center text-sm text-(--muted)">
									{t("landing.noRatedBrews")}
								</div>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* ─── FAQ Section ─── */}
			<section
				className="fade-up rounded-3xl border border-(--sand)/30 bg-(--surface-elevated) p-6 sm:p-10"
				style={{ animationDelay: "360ms" }}
			>
				<div className="mx-auto max-w-3xl text-center">
					<h2 className="font-heading text-3xl tracking-tight text-(--espresso)">{t("landing.faqTitle")}</h2>
					<p className="mt-2 text-(--muted)">{t("landing.faqDesc")}</p>
				</div>
				<div className="mx-auto mt-8 max-w-3xl space-y-3">
					{faqItems.map((item) => (
						<details
							key={item.id}
							className="group rounded-2xl border border-(--sand)/25 bg-(--surface) transition-shadow hover:shadow-sm [[open]]:shadow-md"
						>
							<summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-semibold text-(--espresso)">
								<span>{locale === "id" ? item.question_id : item.question_en}</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="shrink-0 text-(--muted) transition-transform group-open:rotate-180"
									aria-hidden="true"
								>
									<path d="m6 9 6 6 6-6" />
								</svg>
							</summary>
							<div className="border-t border-(--sand)/20 px-5 pb-5 pt-4">
								<p className="text-sm leading-relaxed text-(--muted)">{locale === "id" ? item.answer_id : item.answer_en}</p>
							</div>
						</details>
					))}
				</div>
				<div className="mt-6 text-center">
					<Link
						href="/contact"
						className="text-sm font-semibold text-(--accent) underline underline-offset-4 transition hover:text-(--accent)/80"
					>
						{t("landing.moreHelp")}
					</Link>
				</div>
			</section>

			{/* ─── Join Community CTA ─── */}
			<section
				className="fade-up relative overflow-hidden rounded-3xl border border-(--sand)/30 bg-linear-to-br from-[color-mix(in_oklab,var(--moss)_15%,var(--surface-elevated))] to-[color-mix(in_oklab,var(--crema)_12%,var(--surface-elevated))] p-8 text-center sm:p-12"
				style={{ animationDelay: "440ms" }}
			>
				<div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-(--accent)/5 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-(--crema)/8 blur-3xl" />
				<div className="relative">
					<h2 className="font-heading text-3xl tracking-tight text-(--espresso) sm:text-4xl">
						{t("landing.joinCommunity")}
					</h2>
					<p className="mx-auto mt-3 max-w-xl text-(--muted)">{t("landing.joinDesc")}</p>
					<Link
						href="/signup"
						className="mt-6 inline-flex items-center gap-2 rounded-full bg-(--espresso) px-8 py-3.5 text-sm font-semibold text-(--surface-elevated) shadow-lg shadow-(--espresso)/20 transition hover:shadow-xl hover:brightness-110"
					>
						{t("landing.getStarted")}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12h14" />
							<path d="m12 5 7 7-7 7" />
						</svg>
					</Link>
				</div>
			</section>

			{/* ─── Newsletter ─── */}
			<section
				className="fade-up rounded-3xl border border-(--sand)/30 bg-(--surface-elevated) p-6 sm:p-10"
				style={{ animationDelay: "520ms" }}
			>
				<div className="mx-auto max-w-2xl text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-(--accent)/10 text-(--accent)">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<rect width="20" height="16" x="2" y="4" rx="2" />
							<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
						</svg>
					</div>
					<h2 className="font-heading text-3xl tracking-tight text-(--espresso)">{t("landing.newsletterTitle")}</h2>
					<p className="mt-2 text-(--muted)">{t("landing.newsletterDesc")}</p>
					<div className="mt-6">
						<NewsletterInlineForm />
					</div>
				</div>
			</section>
		</div>
	);
}
