"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { isActivePath, navItemClassName } from "@/lib/navigation";
import type { SiteNavLink } from "@/lib/types";

interface NavLinksProps {
	baseLinks?: SiteNavLink[];
	mobile?: boolean;
}

const hiddenNavHrefs = new Set(["/dashboard", "/admin", "/superuser", "/me"]);

export function NavLinks({ baseLinks, mobile = false }: NavLinksProps) {
	const pathname = usePathname();
	const { locale, t } = useAppPreferences();

	const configuredLinks =
		baseLinks && baseLinks.length > 0
			? baseLinks
					.filter((link) => link.is_visible)
					.map((link) => ({
						href: link.href,
						label: locale === "id" ? link.label_id : link.label_en,
					}))
			: [
					{ href: "/", label: t("nav.home") },
					{ href: "/catalog", label: t("nav.catalog") },
					{ href: "/forum", label: t("nav.forum") },
					{ href: "/blog", label: t("nav.blog") },
					{ href: "/about", label: t("nav.about") },
					{ href: "/contact", label: t("nav.contact") },
				];

	const links = configuredLinks.filter((link) => !hiddenNavHrefs.has(link.href));

	return (
		<>
			{links.map((link) => (
				<Link
					key={link.href}
					href={link.href}
					prefetch
					className={navItemClassName(isActivePath(pathname, link.href), mobile)}
				>
					{link.label}
				</Link>
			))}
		</>
	);
}
