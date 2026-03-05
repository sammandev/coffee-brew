"use client";

import { Copy, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	CollectionsTabs,
	type HistoryCollectionItem,
	type WishlistCollectionItem,
} from "@/components/brew/collections-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CollectionsManagerProps {
	locale: "en" | "id";
}

interface SharePayload {
	created_at: string;
	id: string;
	is_active: boolean;
	owner_id: string;
	token: string;
	updated_at: string;
}

export function CollectionsManager({ locale }: CollectionsManagerProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [wishlist, setWishlist] = useState<WishlistCollectionItem[]>([]);
	const [history, setHistory] = useState<HistoryCollectionItem[]>([]);
	const [share, setShare] = useState<SharePayload | null>(null);
	const [isRotating, setIsRotating] = useState(false);

	const shareUrl = useMemo(() => {
		if (!share?.token) return "";
		if (typeof window === "undefined") return `/collections/share/${share.token}`;
		return `${window.location.origin}/collections/share/${share.token}`;
	}, [share?.token]);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		const [wishlistRes, historyRes, shareRes] = await Promise.all([
			fetch("/api/brews/wishlist", { method: "GET" }).catch(() => null),
			fetch("/api/brews/history", { method: "GET" }).catch(() => null),
			fetch("/api/brews/collections/share", { method: "GET" }).catch(() => null),
		]);

		const [wishlistBody, historyBody, shareBody] = await Promise.all([
			wishlistRes ? wishlistRes.json().catch(() => ({})) : Promise.resolve({}),
			historyRes ? historyRes.json().catch(() => ({})) : Promise.resolve({}),
			shareRes ? shareRes.json().catch(() => ({})) : Promise.resolve({}),
		]);

		const wishlistRows = wishlistRes?.ok
			? ((
					wishlistBody as {
						items?: Array<{
							brew?: WishlistCollectionItem["brew"];
							brew_id?: string;
							created_at?: string;
							my_star_rating?: number | null;
						}>;
					}
				).items ?? [])
			: [];
		const historyRows = historyRes?.ok
			? ((
					historyBody as {
						items?: Array<{ brew?: HistoryCollectionItem["brew"]; last_brewed_at?: string; my_overall?: number }>;
					}
				).items ?? [])
			: [];

		// Build list projections from endpoints that already include brew payload (history)
		const historyItems: HistoryCollectionItem[] = historyRows
			.filter((row): row is { brew: HistoryCollectionItem["brew"]; last_brewed_at: string; my_overall: number } =>
				Boolean(row.brew),
			)
			.map((row) => ({
				brew: row.brew,
				last_brewed_at: row.last_brewed_at,
				my_overall: Number(row.my_overall ?? 0),
			}));

		const hydratedWishlist: WishlistCollectionItem[] = wishlistRows.flatMap((row) =>
			row.brew && row.created_at
				? [
						{
							brew: row.brew,
							saved_at: row.created_at,
							my_star_rating: row.my_star_rating ?? null,
						} as WishlistCollectionItem,
					]
				: [],
		);

		const loadedShare = shareRes?.ok
			? (((shareBody as { share?: SharePayload | null }).share ?? null) as SharePayload | null)
			: null;
		setWishlist(hydratedWishlist);
		setHistory(historyItems);
		setShare(loadedShare);

		if (!wishlistRes?.ok || !historyRes?.ok || !shareRes?.ok) {
			const firstErrorBody = [wishlistBody, historyBody, shareBody].find((body) => {
				const payload = body as { error?: unknown };
				return typeof payload.error === "string" && payload.error.length > 0;
			}) as { error?: string; details?: string } | undefined;
			const details = firstErrorBody?.details ? ` (${firstErrorBody.details})` : "";
			setError(
				locale === "id"
					? `Gagal memuat sebagian koleksi brew${details}.`
					: `Could not load part of brew collections${details}.`,
			);
		}

		setIsLoading(false);

		// Auto-generate share token if the user doesn't have one yet
		if (!loadedShare) {
			const autoRotateRes = await fetch("/api/brews/collections/share/rotate", { method: "POST" }).catch(() => null);
			if (autoRotateRes?.ok) {
				const autoBody = (await autoRotateRes.json().catch(() => ({}))) as { share?: SharePayload };
				if (autoBody.share) setShare(autoBody.share);
			}
		}
	}, [locale]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	async function rotateToken() {
		setIsRotating(true);
		setFeedback(null);
		const response = await fetch("/api/brews/collections/share/rotate", { method: "POST" }).catch(() => null);
		if (!response?.ok) {
			setFeedback(locale === "id" ? "Gagal membuat token share baru." : "Could not rotate share token.");
			setIsRotating(false);
			return;
		}
		const body = (await response.json().catch(() => ({}))) as { share?: SharePayload };
		setShare(body.share ?? null);
		setIsRotating(false);
		setFeedback(locale === "id" ? "Token share berhasil diperbarui." : "Share token rotated.");
	}

	async function copyShareUrl() {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setFeedback(locale === "id" ? "URL share berhasil disalin." : "Share URL copied.");
		} catch {
			setFeedback(locale === "id" ? "Tidak bisa menyalin URL share." : "Could not copy share URL.");
		}
	}

	async function removeWishlistItem(brewId: string) {
		setFeedback(null);
		const response = await fetch(`/api/brews/wishlist/${brewId}`, { method: "DELETE" }).catch(() => null);
		if (!response?.ok) {
			setFeedback(locale === "id" ? "Gagal menghapus wishlist." : "Could not remove wishlist item.");
			return;
		}
		setWishlist((current) => current.filter((item) => item.brew.id !== brewId));
	}

	return (
		<div className="space-y-5">
			<Card className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="font-heading text-2xl text-(--espresso)">
						{locale === "id" ? "Bagikan Koleksi" : "Share Collections"}
					</h2>
					<div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onClick={() => void rotateToken()}
							disabled={isRotating}
							className="justify-center"
						>
							<RotateCcw size={14} />
							{locale === "id" ? "Putar Token" : "Rotate Token"}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => void copyShareUrl()}
							disabled={!shareUrl}
							className="justify-center"
						>
							<Copy size={14} />
							{locale === "id" ? "Salin URL" : "Copy URL"}
						</Button>
					</div>
				</div>
				<p className="break-all text-sm text-(--muted)">
					{shareUrl ? (
						shareUrl
					) : (
						<span className="italic text-(--muted)">{locale === "id" ? "Memuat URL share..." : "Loading share URL..."}</span>
					)}
				</p>
			</Card>

			{feedback ? <p className="text-sm text-(--accent)">{feedback}</p> : null}
			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

			{isLoading ? (
				<Card>
					<p className="text-sm text-(--muted)">{locale === "id" ? "Memuat koleksi..." : "Loading collections..."}</p>
				</Card>
			) : (
				<CollectionsTabs history={history} wishlist={wishlist} locale={locale} onRemoveWishlist={removeWishlistItem} />
			)}
		</div>
	);
}
