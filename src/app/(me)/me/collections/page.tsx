import { requireRole } from "@/components/auth-guard";
import { CollectionsManager } from "@/components/brew/collections-manager";
import { ForumBreadcrumbs } from "@/components/forum/forum-breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { getServerI18n } from "@/lib/i18n/server";

export default async function MeCollectionsPage() {
	await requireRole({ exactRole: "user", onUnauthorized: "forbidden" });
	const { locale } = await getServerI18n();

	return (
		<div className="space-y-6">
			<ForumBreadcrumbs
				items={[
					{ href: "/", label: locale === "id" ? "Beranda" : "Home" },
					{ href: "/me", label: locale === "id" ? "Dashboard Saya" : "My Dashboard" },
					{ label: locale === "id" ? "Koleksi Saya" : "My Collections" },
				]}
			/>

			<header className="space-y-2">
				<Badge>{locale === "id" ? "Koleksi Brew" : "Brew Collections"}</Badge>
				<h1 className="font-heading text-4xl text-(--espresso)">{locale === "id" ? "Koleksi Saya" : "My Collections"}</h1>
				<p className="text-(--muted)">
					{locale === "id"
						? "Kelola wishlist dan riwayat seduh Anda, lalu bagikan dengan URL token publik."
						: "Manage your wishlist and brewed history, then share both via a public token URL."}
				</p>
			</header>

			<CollectionsManager locale={locale} />
		</div>
	);
}
