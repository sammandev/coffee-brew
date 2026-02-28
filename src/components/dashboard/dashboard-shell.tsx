"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
	userId: string;
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
	userId,
}: DashboardShellProps) {
	const pathname = usePathname();
	const initializedRef = useRef(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		if (window.matchMedia("(min-width: 1024px)").matches) {
			setSidebarOpen(true);
		}
	}, []);

	useEffect(() => {
		if (!initializedRef.current) {
			initializedRef.current = true;
			return;
		}
		if (!pathname) return;

		if (window.matchMedia("(max-width: 1023px)").matches) {
			setSidebarOpen(false);
		}
	}, [pathname]);

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--surface)_40%,transparent),transparent_45%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_96%,var(--surface)_4%),var(--background))] text-foreground">
			<div className="mx-auto flex w-full max-w-420 gap-4 px-3 py-4 sm:px-4 lg:px-6">
				<DashboardSidebar locale={locale} onClose={() => setSidebarOpen(false)} open={sidebarOpen} role={role} />
				<div className="flex h-[calc(100vh-2rem)] min-h-160 flex-1 flex-col overflow-hidden rounded-3xl border border-(--border) bg-(--surface) shadow-[0_20px_58px_-38px_var(--overlay)]">
					<DashboardNavbar
						appName={appName}
						avatarUrl={avatarUrl}
						displayName={displayName}
						email={email}
						locale={locale}
						onToggleSidebar={() => setSidebarOpen((current) => !current)}
						role={role}
						sidebarOpen={sidebarOpen}
						title={title}
						userId={userId}
					/>
					<main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
					<DashboardFooter appName={appName} locale={locale} />
				</div>
			</div>
		</div>
	);
}
