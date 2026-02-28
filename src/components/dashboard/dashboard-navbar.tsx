import { ArrowUpRight, PanelLeft, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { NavbarNotifications } from "@/components/layout/navbar-notifications";
import { PreferenceControls } from "@/components/layout/preference-controls";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DashboardNavbarProps {
	appName: string;
	avatarUrl: string | null;
	displayName: string;
	email: string;
	locale: "en" | "id";
	onToggleSidebar: () => void;
	role: Role;
	sidebarOpen: boolean;
	title: string;
	userId: string;
}

function buildMobileLinks(locale: "en" | "id", role: Role) {
	const links = [
		{ href: "/dashboard", label: locale === "id" ? "Ringkasan" : "Overview" },
		{ href: "/dashboard/brews", label: locale === "id" ? "Brew" : "Brews" },
		{ href: "/dashboard/moderation", label: locale === "id" ? "Moderasi" : "Moderation" },
		{ href: "/dashboard/blog", label: "Blog" },
	];

	if (role === "superuser") {
		links.push({ href: "/dashboard/settings", label: locale === "id" ? "Pengaturan" : "Settings" });
	}

	return links;
}

export function DashboardNavbar({
	appName,
	avatarUrl,
	displayName,
	email,
	locale,
	onToggleSidebar,
	role,
	sidebarOpen,
	title,
	userId,
}: DashboardNavbarProps) {
	const mobileLinks = buildMobileLinks(locale, role);

	return (
		<header className="sticky top-0 z-[60] border-b border-(--border) bg-(--surface-elevated)/96 px-4 py-3 backdrop-blur-sm sm:px-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-start gap-2">
					<Button
						type="button"
						size="icon"
						variant="ghost"
						onClick={onToggleSidebar}
						aria-label={locale === "id" ? "Tampilkan atau sembunyikan sidebar" : "Show or hide sidebar"}
						aria-pressed={sidebarOpen}
						className={cn("rounded-lg border border-(--border) bg-(--surface)")}
					>
						{sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
					</Button>

					<div className="min-w-0">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--muted)">{appName}</p>
						<div className="mt-1 flex items-center gap-2">
							<h1 className="truncate font-heading text-2xl text-(--espresso)">{title}</h1>
							<span className="rounded-full border bg-(--surface) px-2 py-0.5 text-xs font-semibold text-(--muted)">
								{role === "superuser" ? "Superuser" : locale === "id" ? "Admin" : "Admin"}
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Link
						href="/"
						className="inline-flex h-9 items-center gap-1 rounded-lg border border-(--border) bg-(--surface) px-2.5 text-xs font-semibold text-(--muted) transition hover:bg-(--sand)/15 hover:text-foreground"
					>
						<span>{locale === "id" ? "Ke situs publik" : "Public site"}</span>
						<ArrowUpRight size={14} />
					</Link>
					<PreferenceControls />
					<NavbarNotifications userId={userId} />
					<UserProfileMenu
						accountRole={role}
						avatarUrl={avatarUrl}
						displayName={displayName}
						email={email}
						labels={{
							dashboard: locale === "id" ? "Dashboard" : "Dashboard",
							profileSettings: locale === "id" ? "Pengaturan Profil" : "Profile Settings",
							signOut: locale === "id" ? "Keluar" : "Sign Out",
						}}
					/>
				</div>
			</div>

			<nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
				{mobileLinks.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						className="rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
					>
						{link.label}
					</Link>
				))}
			</nav>
		</header>
	);
}
