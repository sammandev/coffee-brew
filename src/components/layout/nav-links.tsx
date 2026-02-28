"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { isActivePath, navItemClassName } from "@/lib/navigation";

interface NavLinksProps {
	includeDashboard: boolean;
	includeAdmin: boolean;
	includeSuperuser: boolean;
	mobile?: boolean;
}

export function NavLinks({ includeDashboard, includeAdmin, includeSuperuser, mobile = false }: NavLinksProps) {
	const pathname = usePathname();
	const { t } = useAppPreferences();

	const links = [
		{ href: "/", label: t("nav.home") },
		{ href: "/catalog", label: t("nav.catalog") },
		{ href: "/forum", label: t("nav.forum") },
		{ href: "/blog", label: t("nav.blog") },
		{ href: "/about", label: t("nav.about") },
		{ href: "/contact", label: t("nav.contact") },
		...(includeDashboard ? [{ href: "/dashboard", label: t("nav.dashboard") }] : []),
		...(includeAdmin ? [{ href: "/admin", label: t("nav.admin") }] : []),
		...(includeSuperuser ? [{ href: "/superuser", label: t("nav.superuser") }] : []),
	];

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
