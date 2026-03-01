import { notFound } from "next/navigation";
import {
	CollectionsTabs,
	type HistoryCollectionItem,
	type WishlistCollectionItem,
} from "@/components/brew/collections-tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface SharedCollectionsPageProps {
	params: Promise<{ token: string }>;
}

export default async function SharedCollectionsPage({ params }: SharedCollectionsPageProps) {
	const [{ locale }, { token }] = await Promise.all([getServerI18n(), params]);
	const normalizedToken = token.trim();
	if (!normalizedToken) notFound();

	const supabase = createSupabaseAdminClient();
	const { data: share } = await supabase
		.from("brew_collection_shares")
		.select("owner_id, token, is_active")
		.eq("token", normalizedToken)
		.eq("is_active", true)
		.maybeSingle<{ owner_id: string; token: string; is_active: boolean }>();

	if (!share) notFound();

	const [{ data: ownerProfile }, { data: wishlistRows }, { data: historyRows }] = await Promise.all([
		supabase.from("profiles").select("id, display_name, email").eq("id", share.owner_id).maybeSingle(),
		supabase
			.from("brew_wishlist")
			.select("brew_id, created_at")
			.eq("user_id", share.owner_id)
			.order("created_at", { ascending: false }),
		supabase
			.from("brew_reviews")
			.select("brew_id, overall, updated_at")
			.eq("reviewer_id", share.owner_id)
			.order("updated_at", { ascending: false })
			.limit(200),
	]);

	const brewIds = Array.from(
		new Set([...(wishlistRows ?? []).map((row) => row.brew_id), ...(historyRows ?? []).map((row) => row.brew_id)]),
	);
	const { data: brewRows } =
		brewIds.length > 0
			? await supabase
					.from("brews")
					.select(
						"id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, recommended_methods, tags, status, created_at",
					)
					.in("id", brewIds)
					.eq("status", "published")
			: { data: [] };

	const brewById = new Map((brewRows ?? []).map((row) => [row.id, row]));

	const wishlist: WishlistCollectionItem[] = (wishlistRows ?? [])
		.map((row) => {
			const brew = brewById.get(row.brew_id);
			if (!brew) return null;
			return {
				brew,
				saved_at: row.created_at,
			};
		})
		.filter((value): value is WishlistCollectionItem => Boolean(value));

	const history: HistoryCollectionItem[] = (historyRows ?? [])
		.map((row) => {
			const brew = brewById.get(row.brew_id);
			if (!brew) return null;
			return {
				brew,
				last_brewed_at: row.updated_at,
				my_overall: Number(row.overall),
			};
		})
		.filter((value): value is HistoryCollectionItem => Boolean(value));

	const ownerLabel = ownerProfile?.display_name?.trim() || ownerProfile?.email || "Unknown User";

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{locale === "id" ? "Koleksi Publik" : "Public Collections"}</Badge>
				<h1 className="font-heading text-4xl text-(--espresso)">
					{locale === "id" ? "Koleksi Brew" : "Brew Collections"} · {ownerLabel}
				</h1>
				<p className="text-(--muted)">
					{locale === "id"
						? "Halaman ini menampilkan wishlist dan riwayat seduh yang dibagikan pemilik koleksi."
						: "This page shows the owner's shared wishlist and brewed history."}
				</p>
			</header>

			{wishlist.length === 0 && history.length === 0 ? (
				<Card>
					<p className="text-sm text-(--muted)">
						{locale === "id" ? "Belum ada koleksi publik untuk ditampilkan." : "No public collections to show yet."}
					</p>
				</Card>
			) : (
				<CollectionsTabs history={history} wishlist={wishlist} locale={locale} />
			)}
		</div>
	);
}
