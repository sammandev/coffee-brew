"use client";

interface DashboardFooterProps {
	appName: string;
	locale: "en" | "id";
}

export function DashboardFooter({ appName, locale }: DashboardFooterProps) {
	return (
		<footer className="border-t border-(--border) bg-(--surface-elevated)/95 px-4 py-3 sm:px-6">
			<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-(--muted)">
				<p>
					© {new Date().getFullYear()} {appName}
				</p>
				<p>{locale === "id" ? "Workspace operasional internal." : "Internal operations workspace."}</p>
			</div>
		</footer>
	);
}
