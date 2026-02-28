"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, navItemClassName } from "@/lib/navigation";
import type { Role } from "@/lib/types";

interface DashboardSidebarProps {
	locale: "en" | "id";
	role: Role;
}

interface SidebarLink {
	href: string;
	label: string;
}

function buildLinks(locale: "en" | "id", role: Role): SidebarLink[] {
	const commonLinks: SidebarLink[] = [
		{ href: "/dashboard", label: locale === "id" ? "Ringkasan" : "Overview" },
		{ href: "/dashboard/landing", label: locale === "id" ? "Landing" : "Landing" },
		{ href: "/dashboard/faq", label: "FAQ" },
		{ href: "/dashboard/moderation", label: locale === "id" ? "Moderasi" : "Moderation" },
		{ href: "/dashboard/blog", label: "Blog" },
	];

	if (role === "superuser") {
		return [
			...commonLinks,
			{ href: "/dashboard/rbac", label: "RBAC" },
			{ href: "/dashboard/users", label: locale === "id" ? "Pengguna" : "Users" },
			{ href: "/dashboard/settings", label: locale === "id" ? "Pengaturan" : "Settings" },
		];
	}

	return commonLinks;
}

export function DashboardSidebar({ locale, role }: DashboardSidebarProps) {
	const pathname = usePathname();
	const links = buildLinks(locale, role);

	return (
		<aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-72 shrink-0 border-r border-(--border) bg-(--surface)/90 pr-4 lg:block">
			<div className="flex h-full flex-col py-6">
				<div className="mb-4 px-2">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--muted)">
						{locale === "id" ? "Panel Admin" : "Admin Panel"}
					</p>
					<p className="mt-2 text-sm text-(--muted)">
						{role === "superuser" ? "Superuser" : locale === "id" ? "Admin" : "Admin"}
					</p>
				</div>
				<nav className="grid gap-1">
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							prefetch
							className={navItemClassName(isActivePath(pathname, link.href), true)}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="mt-auto px-2 pt-6 text-xs text-(--muted)">
					<Link href="/" className="underline underline-oKembali ke situs publikffset-4">
						{locale === "id" ? "" : "Go to public site"}
					</Link>
				</div>
			</div>
		</aside>
	);
}
