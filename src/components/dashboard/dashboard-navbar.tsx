import { ArrowUpRight, PanelLeft, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { DashboardMobileMenu } from "@/components/dashboard/dashboard-mobile-menu";
import { NavbarMessages } from "@/components/layout/navbar-messages";
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
						<h1 className="mt-1 truncate font-heading text-2xl text-(--espresso)">{title}</h1>
					</div>
				</div>

				<div className="hidden items-center gap-2 lg:flex">
					<Link
						href="/"
						className="inline-flex h-9 items-center gap-1 rounded-lg border border-(--border) bg-(--surface) px-2.5 text-xs font-semibold text-(--muted) transition hover:bg-(--sand)/15 hover:text-foreground"
					>
						<span>{locale === "id" ? "Ke situs publik" : "Public site"}</span>
						<ArrowUpRight size={14} />
					</Link>
					<PreferenceControls />
					<NavbarMessages userId={userId} />
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

				<div className="flex items-center gap-2 lg:hidden">
					<UserProfileMenu
						accountRole={role}
						avatarUrl={avatarUrl}
						displayName={displayName}
						email={email}
						mobilePanelMode="viewport"
						labels={{
							dashboard: locale === "id" ? "Dashboard" : "Dashboard",
							profileSettings: locale === "id" ? "Pengaturan Profil" : "Profile Settings",
							signOut: locale === "id" ? "Keluar" : "Sign Out",
						}}
					/>
					<DashboardMobileMenu locale={locale} userId={userId} />
				</div>
			</div>
		</header>
	);
}
