"use client";

import { GitCompare, Heart, MessageSquare, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MethodRecommendationChips } from "@/components/brew/method-recommendation-chips";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { resolveBrewImageUrl } from "@/lib/brew-images";
import { getMessage } from "@/lib/i18n/messages";
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
	wishlist_count: number;
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

function StarRating({ rating, count, locale }: { rating: number; count: number; locale: "en" | "id" }) {
	const fullStars = Math.round(rating);
	return (
		<div className="flex items-center gap-1.5">
			<div className="flex items-center gap-px">
				{[0, 1, 2, 3, 4].map((starIndex) => (
					<Star
						key={`star-${starIndex}`}
						size={14}
						className={starIndex < fullStars ? "fill-(--crema) text-(--crema)" : "text-(--sand)"}
					/>
				))}
			</div>
			<span className="text-xs font-medium text-(--muted)">
				{count > 0 ? `${rating.toFixed(1)} (${count})` : getMessage(locale, "catalog.noReviews")}
			</span>
		</div>
	);
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
				setFeedback(getMessage(locale, "catalog.maxCompare"));
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
			setFeedback(body?.error ?? getMessage(locale, "catalog.wishlistFail"));
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

	const m = (key: Parameters<typeof getMessage>[1]) => getMessage(locale, key);

	return (
		<div className="space-y-4">
			{feedback ? <p className="text-sm text-(--danger)">{feedback}</p> : null}

			<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
				{brews.map((brew, index) => {
					const isWishlisted = wishlistIds.has(brew.id);
					const inCompare = compareIds.includes(brew.id);
					const discussHref = isAuthenticated
						? `/forum?discussBrewId=${brew.id}`
						: `/login?next=${toNextParam(`/forum?discussBrewId=${brew.id}`)}`;

					return (
						<Card
							key={brew.id}
							className="group flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-[0_20px_60px_-20px_var(--overlay)]"
						>
							{/* Image section with overlays */}
							<div className="relative overflow-hidden">
								<Link href={`/brew/${brew.id}`} className="block" tabIndex={-1}>
									<div className="relative aspect-16/10 w-full overflow-hidden">
										<Image
											src={resolveBrewImageUrl(brew.image_url)}
											alt={brew.image_alt || brew.name}
											fill
											sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
											loading={index < 3 ? "eager" : "lazy"}
											fetchPriority={index < 3 ? "high" : "auto"}
											className="object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									</div>
								</Link>
								<span className="absolute top-3 left-3 z-10 rounded-full bg-(--surface-elevated)/90 px-2.5 py-1 text-xs font-semibold text-(--espresso) shadow-sm backdrop-blur-sm">
									{brew.brew_method}
								</span>
								{isAuthenticated ? (
									<button
										type="button"
										onClick={() => void toggleWishlist(brew.id)}
										disabled={wishlistBusyId === brew.id}
										className="absolute top-3 right-3 z-10 rounded-full bg-(--surface-elevated)/80 p-2 shadow-sm backdrop-blur-sm transition hover:bg-(--surface-elevated) disabled:opacity-50"
										aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
									>
										<Heart size={15} className={cn(isWishlisted ? "fill-(--danger) text-(--danger)" : "text-(--muted)")} />
									</button>
								) : null}
							</div>

							{/* Content */}
							<div className="flex flex-1 flex-col gap-2.5 p-5">
								<div className="flex items-center justify-between">
									<StarRating rating={brew.rating_avg} count={brew.review_total} locale={locale} />
									<span
										className="inline-flex items-center gap-1 text-xs text-(--muted)"
										title={`${brew.wishlist_count} ${m("catalog.favorites")}`}
									>
										<Heart size={12} className={brew.wishlist_count > 0 ? "fill-(--danger) text-(--danger)" : "text-(--sand)"} />
										{brew.wishlist_count}
									</span>
								</div>

								<Link href={`/brew/${brew.id}`} className="hover:underline">
									<CardTitle className="line-clamp-2 text-lg">{brew.name}</CardTitle>
								</Link>

								<div className="space-y-0.5 text-sm text-(--muted)">
									<p className="line-clamp-1">{brew.coffee_beans}</p>
									<p className="line-clamp-1">
										{brew.brand_roastery}
										{brew.bean_process ? ` · ${brew.bean_process}` : ""}
									</p>
								</div>

								<MethodRecommendationChips locale={locale} methods={brew.recommended_methods ?? []} />

								{Array.isArray(brew.tags) && brew.tags.length > 0 ? (
									<div className="flex flex-wrap gap-1.5">
										{brew.tags.slice(0, 4).map((tag) => (
											<span
												key={`${brew.id}-${tag}`}
												className="rounded-full bg-(--sand)/15 px-2 py-0.5 text-[11px] font-medium text-(--muted)"
											>
												#{tag}
											</span>
										))}
									</div>
								) : null}

								<p className="mt-auto pt-1 text-xs text-(--muted)">
									{m("catalog.by")} {brew.brewer_name} · {formatDate(brew.created_at, locale)}
								</p>

								{/* Actions */}
								<div className="flex items-center gap-2 border-t pt-3">
									<Link
										href={discussHref}
										className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold text-(--muted) transition hover:bg-(--sand)/15"
									>
										<MessageSquare size={13} />
										{m("catalog.discuss")}
									</Link>
									<button
										type="button"
										onClick={() => toggleCompare(brew.id)}
										className={cn(
											"inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
											inCompare ? "border-(--accent) bg-(--accent)/10 text-(--accent)" : "text-(--muted) hover:bg-(--sand)/15",
										)}
										aria-label={inCompare ? "Remove from compare" : "Add to compare"}
									>
										<GitCompare size={13} />
										{inCompare ? m("catalog.selected") : m("catalog.compare")}
									</button>
								</div>
							</div>
						</Card>
					);
				})}
			</div>

			{/* Compare Tray */}
			{compareIds.length > 0 ? (
				<div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto max-w-4xl rounded-2xl border bg-(--surface-elevated)/95 p-4 shadow-xl backdrop-blur md:inset-x-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--accent)/15 text-xs font-bold text-(--accent)">
								{compareIds.length}
							</span>
							<p className="text-sm font-medium text-(--espresso)">{m("catalog.compareTray")}</p>
							<p className="hidden text-sm text-(--muted) sm:block">
								{compareIds.map((id) => brewNameMap.get(id) ?? id.slice(0, 8)).join(", ")}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setCompareIds([])}
								aria-label={locale === "id" ? "Kosongkan compare tray" : "Clear compare tray"}
							>
								{m("catalog.clearCompare")}
							</Button>
							<Link href={compareHref}>
								<Button type="button" size="sm" disabled={compareIds.length < 2}>
									<GitCompare size={14} />
									{m("catalog.compareAction")}
								</Button>
							</Link>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
