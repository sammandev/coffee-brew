import Link from "next/link";
import { NewsletterInlineForm } from "@/components/forms/newsletter-inline-form";
import { LandingSectionRenderer } from "@/components/layout/landing-section-renderer";
import { resolveLocalizedConfig } from "@/lib/i18n/localize";
import { getServerI18n } from "@/lib/i18n/server";
import { getVisibleFaqItems, getVisibleLandingSections } from "@/lib/queries";

export default async function LandingPage() {
	const [{ locale, t }, sections, faqItems] = await Promise.all([
		getServerI18n(),
		getVisibleLandingSections(),
		getVisibleFaqItems(),
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
							ctaLink: "/dashboard/brews/new",
							assetUrl: "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?auto=format&fit=crop&w=1400&q=80",
							assetAlt: "Coffee grinder and beans",
						},
						config_id: {
							ctaText: "Buat Racikan",
							ctaLink: "/dashboard/brews/new",
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
								{ label: "Published Brews", label_id: "Racikan Dipublikasikan", value: "1,250+" },
								{ label: "Forum Threads", label_id: "Thread Forum", value: "340+" },
								{ label: "Review Entries", label_id: "Entri Review", value: "5,000+" },
								{ label: "Roasteries", label_id: "Roastery", value: "120+" },
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

	const prioritizedImageSectionId =
		fallbackSections.find((section) => {
			const config = resolveLocalizedConfig(locale, section.config, section.config_id);
			return typeof config.assetUrl === "string" && config.assetUrl.trim().length > 0;
		})?.id ?? null;

	return (
		<div className="space-y-8">
			<div className="space-y-6">
				{fallbackSections.map((section, index) => (
					<div className="fade-up" style={{ animationDelay: `${index * 100}ms` }} key={section.id}>
						<LandingSectionRenderer section={section} locale={locale} eagerImage={section.id === prioritizedImageSectionId} />
					</div>
				))}
			</div>

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
