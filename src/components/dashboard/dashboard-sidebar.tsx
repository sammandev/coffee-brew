"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, navItemClassName } from "@/lib/navigation";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
	locale: "en" | "id";
	onClose: () => void;
	open: boolean;
	role: Role;
}

interface SidebarLink {
	href: string;
	label: string;
}

interface SidebarSection {
	title: string;
	links: SidebarLink[];
}

function buildSections(locale: "en" | "id", role: Role): SidebarSection[] {
	const main: SidebarSection = {
		title: locale === "id" ? "Utama" : "Main",
		links: [
			{ href: "/dashboard", label: locale === "id" ? "Ringkasan" : "Overview" },
			{ href: "/dashboard/brews", label: locale === "id" ? "Brew" : "Brews" },
			{ href: "/dashboard/collections", label: locale === "id" ? "Koleksi" : "Collections" },
			{ href: "/dashboard/landing", label: "Landing" },
			{ href: "/dashboard/faq", label: "FAQ" },
			{ href: "/dashboard/blog", label: "Blog" },
		],
	};

	const operations: SidebarSection = {
		title: locale === "id" ? "Operasional" : "Operations",
		links: [
			{ href: "/dashboard/moderation", label: locale === "id" ? "Moderasi" : "Moderation" },
			{ href: "/dashboard/moderation/reports", label: locale === "id" ? "Laporan Forum" : "Forum Reports" },
			{ href: "/dashboard/forum", label: locale === "id" ? "Kategori Forum" : "Forum Taxonomy" },
		],
	};

	const account: SidebarSection = {
		title: locale === "id" ? "Akun" : "Account",
		links: [{ href: "/dashboard/profile", label: locale === "id" ? "Profil" : "Profile" }],
	};

	const sections: SidebarSection[] = [main, operations, account];

	if (role === "superuser") {
		sections.push({
			title: locale === "id" ? "Superuser" : "Superuser",
			links: [
				{ href: "/dashboard/rbac", label: "RBAC" },
				{ href: "/dashboard/users", label: locale === "id" ? "Pengguna" : "Users" },
				{ href: "/dashboard/settings", label: locale === "id" ? "Pengaturan" : "Settings" },
				{ href: "/dashboard/badges", label: locale === "id" ? "Badge" : "Badges" },
			],
		});
	}

	return sections;
}

export function DashboardSidebar({ locale, onClose, open, role }: DashboardSidebarProps) {
	const pathname = usePathname();
	const sections = buildSections(locale, role);

	function isLinkActive(href: string) {
		if (href === "/dashboard") {
			return pathname === "/dashboard";
		}
		return isActivePath(pathname, href);
	}

	function onLinkNavigate() {
		if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
			onClose();
		}
	}

	function renderSidebarContent(showCloseButton: boolean) {
		return (
			<div className="flex h-full flex-col">
				<div className="mb-4 rounded-2xl border bg-(--surface) p-3">
					<div className="flex items-start justify-between gap-2">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--muted)">
								{locale === "id" ? "Panel Operasi" : "Operations Panel"}
							</p>
							<p className="mt-2 text-sm font-semibold text-(--espresso)">
								{role === "superuser" ? "Superuser" : locale === "id" ? "Admin" : "Admin"}
							</p>
						</div>
						{showCloseButton ? (
							<button
								type="button"
								onClick={onClose}
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-(--border) bg-(--surface-elevated) text-(--muted) hover:text-foreground"
								aria-label={locale === "id" ? "Tutup sidebar" : "Close sidebar"}
							>
								<X size={15} />
							</button>
						) : null}
					</div>
				</div>

				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
					{sections.map((section) => (
						<section key={section.title} className="space-y-1">
							<h2 className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--muted)">{section.title}</h2>
							<nav className="grid gap-1">
								{section.links.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										prefetch
										onClick={onLinkNavigate}
										className={navItemClassName(isLinkActive(link.href), true)}
									>
										{link.label}
									</Link>
								))}
							</nav>
						</section>
					))}
				</div>
			</div>
		);
	}

	return (
		<>
			{open ? (
				<button
					type="button"
					className="fixed inset-0 z-[90] bg-(--overlay)/40 lg:hidden"
					onClick={onClose}
					aria-label={locale === "id" ? "Tutup sidebar" : "Close sidebar"}
				/>
			) : null}

			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-[100] w-[86vw] max-w-80 border-r border-(--border) bg-(--surface-elevated) p-4 shadow-2xl transition-transform duration-200 lg:hidden",
					open ? "translate-x-0" : "-translate-x-full",
				)}
			>
				{renderSidebarContent(true)}
			</aside>

			<aside
				className={cn(
					"hidden shrink-0 transition-[width,opacity] duration-200 lg:block",
					open ? "w-72 opacity-100" : "w-0 opacity-0",
				)}
				aria-hidden={!open}
			>
				{open ? (
					<div className="sticky top-4 h-[calc(100vh-2rem)] rounded-3xl border border-(--border) bg-(--surface-elevated) p-4">
						{renderSidebarContent(false)}
					</div>
				) : null}
			</aside>
		</>
	);
}
