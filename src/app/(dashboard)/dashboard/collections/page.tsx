import { requireRole } from "@/components/auth-guard";
import { CollectionsManager } from "@/components/brew/collections-manager";
import { Badge } from "@/components/ui/badge";
import { getServerI18n } from "@/lib/i18n/server";

export default async function DashboardCollectionsPage() {
	await requireRole({ minRole: "admin", onUnauthorized: "forbidden" });
	const { locale } = await getServerI18n();

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{locale === "id" ? "Koleksi Brew" : "Brew Collections"}</Badge>
				<h1 className="font-heading text-4xl text-(--espresso)">
					{locale === "id" ? "Koleksi Admin / Superuser" : "Admin / Superuser Collections"}
				</h1>
				<p className="text-(--muted)">
					{locale === "id"
						? "Kelola wishlist dan riwayat seduh akun Anda, termasuk berbagi koleksi via token."
						: "Manage your account wishlist and brewed history, including public token-based sharing."}
				</p>
			</header>

			<CollectionsManager locale={locale} />
		</div>
	);
}
