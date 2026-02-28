interface DashboardFooterProps {
	appName: string;
	locale: "en" | "id";
}

export function DashboardFooter({ appName, locale }: DashboardFooterProps) {
	return (
		<footer className="border-t border-(--border) bg-(--surface-elevated) px-4 py-3 sm:px-6">
			<p className="text-xs text-(--muted)">
				© {new Date().getFullYear()} {appName}.{" "}
				{locale === "id" ? "Panel operasional internal." : "Internal operations panel."}
			</p>
		</footer>
	);
}
