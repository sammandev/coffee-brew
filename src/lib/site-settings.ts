import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SiteFooterLink, SiteNavLink, SiteSettings } from "@/lib/types";

const DEFAULT_NAVBAR_LINKS: SiteNavLink[] = [
	{ href: "/", label_en: "Home", label_id: "Beranda", is_visible: true },
	{ href: "/catalog", label_en: "Catalog", label_id: "Katalog", is_visible: true },
	{ href: "/forum", label_en: "Forum", label_id: "Forum", is_visible: true },
	{ href: "/blog", label_en: "Blog", label_id: "Blog", is_visible: true },
	{ href: "/about", label_en: "About", label_id: "Tentang", is_visible: true },
	{ href: "/contact", label_en: "Contact", label_id: "Kontak", is_visible: true },
];

const DEFAULT_FOOTER_LINKS: SiteFooterLink[] = [
	{ group: "sitemap", href: "/", label_en: "Home", label_id: "Beranda", is_visible: true },
	{ group: "sitemap", href: "/sitemap", label_en: "Sitemap", label_id: "Peta Situs", is_visible: true },
	{ group: "community", href: "/catalog", label_en: "Catalog", label_id: "Katalog", is_visible: true },
	{ group: "community", href: "/forum", label_en: "Forum", label_id: "Forum", is_visible: true },
	{ group: "community", href: "/blog", label_en: "Blog", label_id: "Blog", is_visible: true },
	{ group: "support", href: "/contact", label_en: "Contact", label_id: "Kontak", is_visible: true },
	{ group: "support", href: "/about", label_en: "About", label_id: "Tentang", is_visible: true },
];

const DEFAULT_SETTINGS: SiteSettings = {
	app_name: "Coffee Brew",
	tab_title: "Coffee Brew",
	home_title_en: null,
	home_title_id: null,
	home_subtitle_en: null,
	home_subtitle_id: null,
	navbar_links: DEFAULT_NAVBAR_LINKS,
	footer_tagline_en: "Brew better coffee with recipes, notes, and community feedback.",
	footer_tagline_id: "Seduh kopi lebih baik dengan resep, catatan, dan umpan balik komunitas.",
	footer_description_en: "Track your brews, publish discoveries, and improve one cup at a time.",
	footer_description_id: "Catat racikanmu, publikasikan temuanmu, dan tingkatkan tiap cangkir.",
	footer_links: DEFAULT_FOOTER_LINKS,
	enable_google_login: true,
	enable_magic_link_login: true,
	enable_signup: true,
	tab_icon_url: null,
	tab_icon_storage_path: null,
};

function asString(value: unknown, fallback: string) {
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}

function asNullableString(value: unknown) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function sanitizeNavbarLinks(value: unknown) {
	if (!Array.isArray(value)) return DEFAULT_NAVBAR_LINKS;

	const links: SiteNavLink[] = value
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const href = asString((item as Record<string, unknown>).href, "");
			if (!href.startsWith("/")) return null;
			return {
				href,
				label_en: asString((item as Record<string, unknown>).label_en, href),
				label_id: asString((item as Record<string, unknown>).label_id, href),
				is_visible: Boolean((item as Record<string, unknown>).is_visible ?? true),
			};
		})
		.filter((item): item is SiteNavLink => Boolean(item));

	return links.length > 0 ? links : DEFAULT_NAVBAR_LINKS;
}

function sanitizeFooterLinks(value: unknown) {
	if (!Array.isArray(value)) return DEFAULT_FOOTER_LINKS;

	const links: SiteFooterLink[] = value
		.map((item) => {
			if (!item || typeof item !== "object") return null;

			const group = (item as Record<string, unknown>).group;
			if (group !== "sitemap" && group !== "community" && group !== "support") {
				return null;
			}

			const href = asString((item as Record<string, unknown>).href, "");
			if (!href.startsWith("/")) return null;

			return {
				group,
				href,
				label_en: asString((item as Record<string, unknown>).label_en, href),
				label_id: asString((item as Record<string, unknown>).label_id, href),
				is_visible: Boolean((item as Record<string, unknown>).is_visible ?? true),
			};
		})
		.filter((item): item is SiteFooterLink => Boolean(item));

	return links.length > 0 ? links : DEFAULT_FOOTER_LINKS;
}

export function getDefaultSiteSettings(): SiteSettings {
	return {
		...DEFAULT_SETTINGS,
		navbar_links: [...DEFAULT_SETTINGS.navbar_links],
		footer_links: [...DEFAULT_SETTINGS.footer_links],
	};
}

export async function getSiteSettings(): Promise<SiteSettings> {
	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase.from("site_settings").select("*").eq("id", true).maybeSingle();

	if (error || !data) {
		return getDefaultSiteSettings();
	}

	return {
		app_name: asString(data.app_name, DEFAULT_SETTINGS.app_name),
		tab_title: asString(data.tab_title, DEFAULT_SETTINGS.tab_title),
		home_title_en: asNullableString(data.home_title_en),
		home_title_id: asNullableString(data.home_title_id),
		home_subtitle_en: asNullableString(data.home_subtitle_en),
		home_subtitle_id: asNullableString(data.home_subtitle_id),
		navbar_links: sanitizeNavbarLinks(data.navbar_links),
		footer_tagline_en: asString(data.footer_tagline_en, DEFAULT_SETTINGS.footer_tagline_en),
		footer_tagline_id: asString(data.footer_tagline_id, DEFAULT_SETTINGS.footer_tagline_id),
		footer_description_en: asString(data.footer_description_en, DEFAULT_SETTINGS.footer_description_en),
		footer_description_id: asString(data.footer_description_id, DEFAULT_SETTINGS.footer_description_id),
		footer_links: sanitizeFooterLinks(data.footer_links),
		enable_google_login: Boolean(data.enable_google_login ?? true),
		enable_magic_link_login: Boolean(data.enable_magic_link_login ?? true),
		enable_signup: Boolean(data.enable_signup ?? true),
		tab_icon_url: asNullableString(data.tab_icon_url),
		tab_icon_storage_path: asNullableString(data.tab_icon_storage_path),
	};
}
