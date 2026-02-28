import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";

export default async function HumanSitemapPage() {
	const { t } = await getServerI18n();

	const sections = [
		{
			title: t("footer.sitemap"),
			links: [
				{ href: "/", label: t("nav.home") },
				{ href: "/catalog", label: t("nav.catalog") },
				{ href: "/forum", label: t("nav.forum") },
				{ href: "/blog", label: t("nav.blog") },
			],
		},
		{
			title: t("footer.support"),
			links: [
				{ href: "/about", label: t("nav.about") },
				{ href: "/contact", label: t("nav.contact") },
				{ href: "/login", label: t("nav.login") },
				{ href: "/signup", label: t("nav.signup") },
			],
		},
	];

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{t("sitemap.title")}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("sitemap.title")}</h1>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				{sections.map((section) => (
					<Card key={section.title}>
						<h2 className="font-heading text-2xl text-[var(--espresso)]">{section.title}</h2>
						<ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
							{section.links.map((link) => (
								<li key={link.href}>
									<Link className="underline-offset-4 hover:underline" href={link.href}>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</Card>
				))}
			</div>
		</div>
	);
}
