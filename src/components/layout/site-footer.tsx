import Image from "next/image";
import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";

export async function SiteFooter() {
	const [{ locale, t }, settings] = await Promise.all([getServerI18n(), getSiteSettings()]);

	const year = new Date().getFullYear();
	const footerLinks = settings.footer_links.filter((link) => link.is_visible);
	const grouped = {
		sitemap: footerLinks.filter((link) => link.group === "sitemap"),
		community: footerLinks.filter((link) => link.group === "community"),
		support: footerLinks.filter((link) => link.group === "support"),
	};

	return (
		<footer className="border-t bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_88%,var(--crema)_12%),var(--surface))]">
			<div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 lg:grid-cols-4 lg:px-8">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Image src="/coffee-brew-mark.svg" alt={settings.app_name} width={26} height={26} />
						<p className="font-heading text-2xl text-[var(--espresso)]">{settings.app_name}</p>
					</div>
					<p className="text-[var(--muted)]">{locale === "id" ? settings.footer_tagline_id : settings.footer_tagline_en}</p>
					<p className="text-[var(--muted)]">
						{locale === "id" ? settings.footer_description_id : settings.footer_description_en}
					</p>
				</div>

				<div>
					<h3 className="mb-2 font-semibold text-[var(--espresso)]">{t("footer.sitemap")}</h3>
					<ul className="space-y-1 text-[var(--muted)]">
						{grouped.sitemap.map((link) => (
							<li key={`${link.group}-${link.href}`}>
								<Link href={link.href} className="hover:text-[var(--accent)]">
									{locale === "id" ? link.label_id : link.label_en}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div>
					<h3 className="mb-2 font-semibold text-[var(--espresso)]">{t("footer.community")}</h3>
					<ul className="space-y-1 text-[var(--muted)]">
						{grouped.community.map((link) => (
							<li key={`${link.group}-${link.href}`}>
								<Link href={link.href} className="hover:text-[var(--accent)]">
									{locale === "id" ? link.label_id : link.label_en}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div>
					<h3 className="mb-2 font-semibold text-[var(--espresso)]">{t("footer.support")}</h3>
					<ul className="space-y-1 text-[var(--muted)]">
						{grouped.support.map((link) => (
							<li key={`${link.group}-${link.href}`}>
								<Link href={link.href} className="hover:text-[var(--accent)]">
									{locale === "id" ? link.label_id : link.label_en}
								</Link>
							</li>
						))}
					</ul>
				</div>
			</div>
			<div className="border-t px-4 py-4 text-center text-xs text-[var(--muted)] sm:px-6 lg:px-8">
				© {year} {settings.app_name}. {t("footer.rights")}
			</div>
		</footer>
	);
}
