"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MethodRecommendationChips } from "@/components/brew/method-recommendation-chips";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { formatDate } from "@/lib/utils";

interface CollectionBrewSummary {
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
	recommended_methods: string[] | null;
	status: string;
	tags: string[] | null;
}

export interface WishlistCollectionItem {
	brew: CollectionBrewSummary;
	saved_at: string;
}

export interface HistoryCollectionItem {
	brew: CollectionBrewSummary;
	last_brewed_at: string;
	my_overall: number;
}

interface CollectionsTabsProps {
	history: HistoryCollectionItem[];
	locale: "en" | "id";
	onRemoveWishlist?: (brewId: string) => Promise<void> | void;
	wishlist: WishlistCollectionItem[];
}

type CollectionTab = "wishlist" | "history";

export function CollectionsTabs({ history, locale, onRemoveWishlist, wishlist }: CollectionsTabsProps) {
	const [tab, setTab] = useState<CollectionTab>("wishlist");
	const activeTitle = useMemo(
		() =>
			tab === "wishlist"
				? locale === "id"
					? "Wishlist"
					: "Wishlist"
				: locale === "id"
					? "Riwayat Seduh"
					: "My Brewed History",
		[locale, tab],
	);
	const activeEmpty = useMemo(
		() =>
			tab === "wishlist"
				? locale === "id"
					? "Belum ada brew di wishlist."
					: "No brews in wishlist yet."
				: locale === "id"
					? "Belum ada riwayat seduh."
					: "No brewed history yet.",
		[locale, tab],
	);

	return (
		<div className="space-y-4">
			<div className="grid w-full grid-cols-2 rounded-xl border bg-(--surface) p-1 sm:inline-grid sm:w-auto">
				<button
					type="button"
					onClick={() => setTab("wishlist")}
					className={`rounded-lg px-3 py-1.5 text-center text-sm font-semibold ${
						tab === "wishlist" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"
					}`}
				>
					{locale === "id" ? "Wishlist" : "Wishlist"} ({wishlist.length})
				</button>
				<button
					type="button"
					onClick={() => setTab("history")}
					className={`rounded-lg px-3 py-1.5 text-center text-sm font-semibold ${
						tab === "history" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"
					}`}
				>
					{locale === "id" ? "Riwayat Seduh" : "Brewed History"} ({history.length})
				</button>
			</div>

			<h2 className="font-heading text-2xl text-(--espresso)">{activeTitle}</h2>

			{tab === "wishlist" ? (
				wishlist.length === 0 ? (
					<Card>
						<CardDescription>{activeEmpty}</CardDescription>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{wishlist.map((item) => (
							<Card key={`wishlist-${item.brew.id}`} className="group flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md">
								<div className="relative aspect-16/10 overflow-hidden">
									<Image
										src={resolveBrewImageUrl(item.brew.image_url)}
										alt={item.brew.image_alt || item.brew.name}
										fill
										sizes="(max-width: 1280px) 100vw, 33vw"
										className="object-cover transition-transform duration-300 group-hover:scale-105"
									/>
									<span className="absolute top-3 left-3 z-10 rounded-full bg-(--surface-elevated)/90 px-2.5 py-1 text-xs font-semibold text-(--espresso) shadow-sm backdrop-blur-sm">
										{item.brew.brew_method}
									</span>
								</div>
								<div className="flex flex-1 flex-col gap-2 p-4">
									<Link href={`/brew/${item.brew.id}`} className="hover:underline">
										<CardTitle className="line-clamp-2 text-base">{item.brew.name}</CardTitle>
									</Link>
									<MethodRecommendationChips locale={locale} methods={item.brew.recommended_methods ?? []} />
									<p className="mt-auto text-xs text-(--muted)">
										{locale === "id" ? "Disimpan" : "Saved"}: {formatDate(item.saved_at, locale)}
									</p>
									{onRemoveWishlist ? (
										<Button
											type="button"
											size="sm"
											variant="ghost"
											className="w-full justify-center"
											onClick={() => {
												void onRemoveWishlist(item.brew.id);
											}}
										>
											{locale === "id" ? "Hapus dari Wishlist" : "Remove from Wishlist"}
										</Button>
									) : null}
								</div>
							</Card>
						))}
					</div>
				)
			) : history.length === 0 ? (
				<Card>
					<CardDescription>{activeEmpty}</CardDescription>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{history.map((item) => (
						<Card key={`history-${item.brew.id}-${item.last_brewed_at}`} className="group flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md">
							<div className="relative aspect-16/10 overflow-hidden">
								<Image
									src={resolveBrewImageUrl(item.brew.image_url)}
									alt={item.brew.image_alt || item.brew.name}
									fill
									sizes="(max-width: 1280px) 100vw, 33vw"
									className="object-cover transition-transform duration-300 group-hover:scale-105"
								/>
								<span className="absolute top-3 left-3 z-10 rounded-full bg-(--surface-elevated)/90 px-2.5 py-1 text-xs font-semibold text-(--espresso) shadow-sm backdrop-blur-sm">
									{item.brew.brew_method}
								</span>
								<span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-(--surface-elevated)/90 px-2 py-1 text-xs font-semibold text-(--accent) shadow-sm backdrop-blur-sm">
									★ {item.my_overall.toFixed(1)}
								</span>
							</div>
							<div className="flex flex-1 flex-col gap-2 p-4">
								<Link href={`/brew/${item.brew.id}`} className="hover:underline">
									<CardTitle className="line-clamp-2 text-base">{item.brew.name}</CardTitle>
								</Link>
								<MethodRecommendationChips locale={locale} methods={item.brew.recommended_methods ?? []} />
								<p className="mt-auto text-xs text-(--muted)">
									{locale === "id" ? "Terakhir diseduh" : "Last brewed"}: {formatDate(item.last_brewed_at, locale)}
								</p>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
