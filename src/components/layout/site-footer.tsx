import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
	const { t } = await getServerI18n();

	const year = new Date().getFullYear();

	return (
		<footer className="border-t bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_88%,var(--crema)_12%),var(--surface))]">
			<div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 lg:grid-cols-4 lg:px-8">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Image src="/coffee-brew-mark.svg" alt={APP_NAME} width={26} height={26} />
						<p className="font-heading text-2xl text-[var(--espresso)]">{APP_NAME}</p>
					</div>
					<p className="text-[var(--muted)]">{t("footer.tagline")}</p>
					<p className="text-[var(--muted)]">{t("footer.description")}</p>
				</div>

				<div>
					<h3 className="mb-2 font-semibold text-[var(--espresso)]">{t("footer.sitemap")}</h3>
					<ul className="space-y-1 text-[var(--muted)]">
						<li>
							<Link href="/" className="hover:text-[var(--accent)]">
								{t("nav.home")}
							</Link>
						</li>
						<li>
							<Link href="/sitemap" className="hover:text-[var(--accent)]">
								{t("sitemap.title")}
							</Link>
						</li>
						<li>
							<Link href="/about" className="hover:text-[var(--accent)]">
								{t("nav.about")}
							</Link>
						</li>
						<li>
							<Link href="/contact" className="hover:text-[var(--accent)]">
								{t("nav.contact")}
							</Link>
						</li>
					</ul>
				</div>

				<div>
					<h3 className="mb-2 font-semibold text-[var(--espresso)]">{t("footer.community")}</h3>
					<ul className="space-y-1 text-[var(--muted)]">
						<li>
							<Link href="/catalog" className="hover:text-[var(--accent)]">
								{t("nav.catalog")}
							</Link>
						</li>
						<li>
							<Link href="/forum" className="hover:text-[var(--accent)]">
								{t("nav.forum")}
							</Link>
						</li>
						<li>
							<Link href="/blog" className="hover:text-[var(--accent)]">
								{t("nav.blog")}
							</Link>
						</li>
					</ul>
				</div>

				<div>
					<h3 className="mb-2 font-semibold text-[var(--espresso)]">{t("footer.support")}</h3>
					<ul className="space-y-1 text-[var(--muted)]">
						<li>
							<Link href="/contact" className="hover:text-[var(--accent)]">
								{t("nav.contact")}
							</Link>
						</li>
						<li>
							<Link href="/about" className="hover:text-[var(--accent)]">
								{t("footer.about")}
							</Link>
						</li>
					</ul>
				</div>
			</div>
			<div className="border-t px-4 py-4 text-center text-xs text-[var(--muted)] sm:px-6 lg:px-8">
				© {year} {APP_NAME}. {t("footer.rights")}
			</div>
		</footer>
	);
}
