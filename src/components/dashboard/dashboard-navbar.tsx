import Link from "next/link";
import { PreferenceControls } from "@/components/layout/preference-controls";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";
import type { Role } from "@/lib/types";

interface DashboardNavbarProps {
	appName: string;
	avatarUrl: string | null;
	displayName: string;
	email: string;
	locale: "en" | "id";
	role: Role;
	title: string;
}

export function DashboardNavbar({ appName, avatarUrl, displayName, email, locale, role, title }: DashboardNavbarProps) {
	return (
		<header className="border-b border-(--border) bg-(--surface-elevated)/95 px-4 py-3 sm:px-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--muted)">{appName}</p>
					<h1 className="truncate font-heading text-2xl text-(--espresso)">{title}</h1>
				</div>
				<div className="flex items-center gap-2">
					<PreferenceControls />
					<UserProfileMenu
						avatarUrl={avatarUrl}
						displayName={displayName}
						email={email}
						role={role}
						labels={{
							dashboard: locale === "id" ? "Dashboard" : "Dashboard",
							profileSettings: locale === "id" ? "Pengaturan Profil" : "Profile Settings",
							signOut: locale === "id" ? "Keluar" : "Sign Out",
						}}
					/>
				</div>
			</div>
			<div className="mt-3 flex gap-3 text-sm text-(--muted) lg:hidden">
				<Link href="/dashboard" className="underline underline-offset-4">
					{locale === "id" ? "Ringkasan" : "Overview"}
				</Link>
			</div>
		</header>
	);
}
