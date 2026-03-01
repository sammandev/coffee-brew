"use client";

import { GitCompare, Heart, MessageSquare, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MethodRecommendationChips } from "@/components/brew/method-recommendation-chips";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { cn, formatDate } from "@/lib/utils";

interface CatalogBrewRow {
	bean_process: string | null;
	brew_method: string;
	brewer_name: string;
	brand_roastery: string;
	coffee_beans: string;
	created_at: string;
	id: string;
	image_alt: string | null;
	image_url: string | null;
	name: string;
	rating_avg: number;
	recommended_methods: string[] | null;
	review_total: number;
	tags: string[] | null;
}

interface CatalogBrewGridProps {
	brews: CatalogBrewRow[];
	isAuthenticated: boolean;
	locale: "en" | "id";
}

const COMPARE_STORAGE_KEY = "coffee-brew.compare.ids";

function toNextParam(value: string) {
	return encodeURIComponent(value);
}

export function CatalogBrewGrid({ brews, isAuthenticated, locale }: CatalogBrewGridProps) {
	const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
	const [compareIds, setCompareIds] = useState<string[]>([]);
	const [wishlistBusyId, setWishlistBusyId] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<string | null>(null);

	const brewNameMap = useMemo(() => new Map(brews.map((brew) => [brew.id, brew.name])), [brews]);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as string[];
			if (!Array.isArray(parsed)) return;
			setCompareIds(parsed.filter((value) => typeof value === "string"));
		} catch {
			// no-op
		}
	}, []);

	useEffect(() => {
		try {
			window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareIds));
		} catch {
			// no-op
		}
	}, [compareIds]);

	useEffect(() => {
		if (!isAuthenticated) return;
		void (async () => {
			const response = await fetch("/api/brews/wishlist", { method: "GET" }).catch(() => null);
			if (!response?.ok) return;
			const body = (await response.json().catch(() => ({}))) as {
				items?: Array<{ brew_id?: string }>;
			};
			const ids = new Set(
				(body.items ?? [])
					.map((item) => (typeof item.brew_id === "string" ? item.brew_id : ""))
					.filter((value) => value.length > 0),
			);
			setWishlistIds(ids);
		})();
	}, [isAuthenticated]);

	function toggleCompare(brewId: string) {
		setFeedback(null);
		setCompareIds((current) => {
			if (current.includes(brewId)) return current.filter((value) => value !== brewId);
			if (current.length >= 3) {
				setFeedback(locale === "id" ? "Maksimal 3 brew untuk compare." : "Compare supports up to 3 brews.");
				return current;
			}
			return [...current, brewId];
		});
	}

	async function toggleWishlist(brewId: string) {
		if (!isAuthenticated) return;
		const alreadySaved = wishlistIds.has(brewId);
		setWishlistBusyId(brewId);
		setFeedback(null);
		const response = await fetch(alreadySaved ? `/api/brews/wishlist/${brewId}` : "/api/brews/wishlist", {
			method: alreadySaved ? "DELETE" : "POST",
			headers: alreadySaved
				? undefined
				: {
						"Content-Type": "application/json",
					},
			body: alreadySaved ? undefined : JSON.stringify({ brewId }),
		}).catch(() => null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setFeedback(body?.error ?? (locale === "id" ? "Gagal memperbarui wishlist." : "Could not update wishlist."));
			setWishlistBusyId(null);
			return;
		}

		setWishlistIds((current) => {
			const next = new Set(current);
			if (alreadySaved) next.delete(brewId);
			else next.add(brewId);
			return next;
		});
		setWishlistBusyId(null);
	}

	const compareHref =
		compareIds.length > 0 ? `/catalog/compare?ids=${encodeURIComponent(compareIds.join(","))}` : "/catalog/compare";

	return (
		<div className="space-y-4">
			{feedback ? <p className="text-sm text-(--danger)">{feedback}</p> : null}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{brews.map((brew) => {
					const isWishlisted = wishlistIds.has(brew.id);
					const inCompare = compareIds.includes(brew.id);
					const discussHref = isAuthenticated
						? `/forum?discussBrewId=${brew.id}`
						: `/login?next=${toNextParam(`/forum?discussBrewId=${brew.id}`)}`;

					return (
						<Card
							key={brew.id}
							className="flex h-full flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-[0_16px_50px_-25px_var(--overlay)]"
						>
							<Link href={`/brew/${brew.id}`} className="block">
								<div className="relative aspect-[16/10] w-full">
									<Image
										src={resolveBrewImageUrl(brew.image_url)}
										alt={brew.image_alt || brew.name}
										fill
										sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
										className="object-cover"
									/>
								</div>
							</Link>
							<div className="flex h-full flex-col gap-3 p-5">
								<div>
									<Link href={`/brew/${brew.id}`} className="hover:underline">
										<CardTitle>{brew.name}</CardTitle>
									</Link>
									<CardDescription className="mt-1">{brew.brew_method}</CardDescription>
								</div>

								{Array.isArray(brew.tags) && brew.tags.length > 0 ? (
									<div className="flex flex-wrap gap-1.5">
										{brew.tags.slice(0, 5).map((tag) => (
											<span key={`${brew.id}-${tag}`} className="rounded-full border px-2 py-0.5 text-[11px] text-(--muted)">
												#{tag}
											</span>
										))}
									</div>
								) : null}

								<MethodRecommendationChips locale={locale} methods={brew.recommended_methods ?? []} />

								<p className="line-clamp-1 text-sm text-(--muted)">Beans: {brew.coffee_beans}</p>
								<p className="line-clamp-1 text-sm text-(--muted)">Roastery: {brew.brand_roastery}</p>
								{brew.bean_process ? <p className="line-clamp-1 text-sm text-(--muted)">Process: {brew.bean_process}</p> : null}
								<p className="text-sm text-(--muted)">
									{locale === "id" ? "Rating" : "Rating"}:{" "}
									{brew.review_total > 0
										? `${brew.rating_avg.toFixed(2)} (${brew.review_total})`
										: locale === "id"
											? "Belum ada ulasan"
											: "No reviews yet"}
								</p>
								<p className="mt-auto text-xs text-(--muted)">
									{locale === "id" ? "Oleh" : "By"} {brew.brewer_name} {locale === "id" ? "pada" : "on"}{" "}
									{formatDate(brew.created_at, locale)}
								</p>

								<div className="grid grid-cols-3 gap-2 pt-1 sm:flex sm:flex-wrap">
									<Link href={discussHref} className="block sm:inline-flex">
										<Button type="button" size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
											<MessageSquare size={14} />
											<span className="hidden sm:inline">{locale === "id" ? "Diskusikan" : "Discuss this brew"}</span>
											<span className="sr-only">{locale === "id" ? "Diskusikan Brew Ini" : "Discuss this brew"}</span>
										</Button>
									</Link>
									<Button
										type="button"
										size="sm"
										variant={isWishlisted ? "secondary" : "ghost"}
										className="w-full gap-2 sm:w-auto"
										onClick={() => void toggleWishlist(brew.id)}
										disabled={!isAuthenticated || wishlistBusyId === brew.id}
										aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
									>
										<Heart size={14} className={cn(isWishlisted ? "fill-current" : "")} />
										<span className="hidden sm:inline">
											{isWishlisted ? (locale === "id" ? "Wishlist" : "Wishlisted") : locale === "id" ? "Simpan" : "Wishlist"}
										</span>
										<span className="sr-only">
											{isWishlisted
												? locale === "id"
													? "Hapus dari wishlist"
													: "Remove from wishlist"
												: locale === "id"
													? "Simpan ke wishlist"
													: "Add to wishlist"}
										</span>
									</Button>
									<Button
										type="button"
										size="sm"
										variant={inCompare ? "secondary" : "ghost"}
										className="w-full gap-2 sm:w-auto"
										onClick={() => toggleCompare(brew.id)}
										aria-label={inCompare ? "Remove from compare" : "Add to compare"}
									>
										<GitCompare size={14} />
										<span className="hidden sm:inline">
											{inCompare ? (locale === "id" ? "Dipilih" : "Selected") : locale === "id" ? "Bandingkan" : "Compare"}
										</span>
										<span className="sr-only">
											{inCompare
												? locale === "id"
													? "Hapus dari compare"
													: "Remove from compare"
												: locale === "id"
													? "Tambah ke compare"
													: "Add to compare"}
										</span>
									</Button>
								</div>
							</div>
						</Card>
					);
				})}
			</div>

			{compareIds.length > 0 ? (
				<div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto max-w-4xl rounded-2xl border bg-(--surface-elevated)/95 p-3 shadow-xl backdrop-blur md:inset-x-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-sm text-(--muted)">
							{locale === "id" ? "Compare Tray" : "Compare Tray"}:{" "}
							{compareIds.map((id) => brewNameMap.get(id) ?? id.slice(0, 8)).join(", ")}
						</p>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setCompareIds([])}
								aria-label={locale === "id" ? "Kosongkan compare tray" : "Clear compare tray"}
							>
								{locale === "id" ? "Kosongkan" : "Clear"}
							</Button>
							<Link href={compareHref}>
								<Button type="button" size="sm" disabled={compareIds.length < 2}>
									<Search size={14} />
									{locale === "id" ? "Bandingkan" : "Compare"}
								</Button>
							</Link>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
