import Link from "next/link";
import { DashboardFooter } from "@/components/dashboard/dashboard-footer";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { Role } from "@/lib/types";

interface DashboardShellProps {
	appName: string;
	avatarUrl: string | null;
	children: React.ReactNode;
	displayName: string;
	email: string;
	locale: "en" | "id";
	role: Role;
	title: string;
}

export function DashboardShell({
	appName,
	avatarUrl,
	children,
	displayName,
	email,
	locale,
	role,
	title,
}: DashboardShellProps) {
	return (
		<div className="min-h-screen bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_96%,var(--surface)_4%),var(--background))] text-foreground">
			<div className="mx-auto flex w-full max-w-350 gap-0 px-3 py-3 sm:px-4 lg:px-6">
				<DashboardSidebar locale={locale} role={role} />
				<div className="flex min-h-[calc(100vh-1.5rem)] flex-1 flex-col overflow-hidden rounded-3xl border border-(--border) bg-(--surface) shadow-[0_12px_48px_-30px_var(--overlay)]">
					<DashboardNavbar
						appName={appName}
						avatarUrl={avatarUrl}
						displayName={displayName}
						email={email}
						locale={locale}
						role={role}
						title={title}
					/>
					<main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
					<DashboardFooter appName={appName} locale={locale} />
				</div>
			</div>
			<div className="px-6 pb-4 text-center text-xs text-(--muted) lg:hidden">
				<Link href="/" className="underline underline-offset-4">
					{locale === "id" ? "Kembali ke situs" : "Back to site"}
				</Link>
			</div>
		</div>
	);
}
