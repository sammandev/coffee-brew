"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getMessage } from "@/lib/i18n/messages";
import { formatDate } from "@/lib/utils";

type ReviewSort = "newest" | "oldest" | "highest" | "lowest";
type ReviewStarFilter = "all" | "5" | "4" | "3" | "2" | "1";

interface AggregateSummary {
	star_avg: number;
	star_histogram: Record<1 | 2 | 3 | 4 | 5, number>;
	total: number;
}

interface ReviewItem {
	acidity: number;
	aroma: number;
	balance: number;
	body: number;
	notes: string | null;
	reviewer: {
		avatarUrl: string | null;
		badge: string | null;
		displayName: string;
		joinedAt: string;
		karma: number;
		mentionHandle: string | null;
		totalReviews: number;
		userId: string;
	};
	reviewer_id: string;
	star_rating: number | null;
	sweetness: number;
	updated_at: string;
}

interface RecentReviewsSectionProps {
	aggregate: AggregateSummary;
	locale: "en" | "id";
	reviews: ReviewItem[];
}

function toPlainText(value: string | null) {
	if (!value) return "";
	return value
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function clampText(value: string, length: number) {
	if (value.length <= length) return value;
	return `${value.slice(0, Math.max(0, length - 1)).trimEnd()}...`;
}

function renderStars(value: number) {
	return [0, 1, 2, 3, 4].map((starIndex) => (
		<svg
			key={`review-star-${starIndex}`}
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill={starIndex < Math.round(value) ? "var(--crema)" : "none"}
			stroke={starIndex < Math.round(value) ? "var(--crema)" : "var(--sand)"}
			strokeWidth="2"
			className="shrink-0"
			aria-hidden="true"
			focusable="false"
		>
			<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
		</svg>
	));
}

function getStarFilterLabel(value: ReviewStarFilter, locale: "en" | "id") {
	if (value === "all") {
		return locale === "id" ? "Semua bintang" : "All stars";
	}
	return locale === "id" ? `${value} bintang` : `${value} stars`;
}

export function RecentReviewsSection({ aggregate, locale, reviews }: RecentReviewsSectionProps) {
	const m = (key: Parameters<typeof getMessage>[1]) => getMessage(locale, key);
	const [sort, setSort] = useState<ReviewSort>("newest");
	const [starFilter, setStarFilter] = useState<ReviewStarFilter>("all");

	const visibleReviews = useMemo(() => {
		const filtered = reviews.filter((review) => {
			if (starFilter === "all") return true;
			if (review.star_rating == null) return false;
			return review.star_rating === Number(starFilter);
		});

		const sorted = [...filtered];
		sorted.sort((left, right) => {
			if (sort === "newest") {
				return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
			}
			if (sort === "oldest") {
				return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
			}
			if (sort === "highest") {
				const leftValue = left.star_rating ?? -1;
				const rightValue = right.star_rating ?? -1;
				if (rightValue !== leftValue) return rightValue - leftValue;
				return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
			}

			const leftValue = left.star_rating == null ? 6 : left.star_rating;
			const rightValue = right.star_rating == null ? 6 : right.star_rating;
			if (leftValue !== rightValue) return leftValue - rightValue;
			return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
		});

		return sorted;
	}, [reviews, sort, starFilter]);

	const totalStars = Object.values(aggregate.star_histogram).reduce((sum, count) => sum + count, 0);

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="space-y-1">
					<h2 className="font-heading text-2xl text-(--espresso)">{m("brew.recentReviews")}</h2>
					<p className="text-sm text-(--muted)">
						{aggregate.total} {m("brew.totalReviews")}
					</p>
				</div>
			</div>

			<Card className="space-y-4 p-5">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<span className="text-3xl font-bold text-(--accent)">{aggregate.star_avg.toFixed(1)}</span>
						<div className="space-y-1">
							<div className="flex items-center gap-px">{renderStars(aggregate.star_avg)}</div>
							<p className="text-xs text-(--muted)">
								{aggregate.total} {m("brew.totalReviews")}
							</p>
						</div>
					</div>
				</div>

				{aggregate.total > 0 ? (
					<div className="space-y-1.5">
						{([5, 4, 3, 2, 1] as const).map((star) => {
							const count = aggregate.star_histogram[star];
							const pct = totalStars > 0 ? Math.round((count / totalStars) * 100) : 0;
							return (
								<div key={star} className="flex items-center gap-2 text-xs">
									<span className="w-4 shrink-0 text-right text-(--muted)">{star}</span>
									<svg
										width="11"
										height="11"
										viewBox="0 0 24 24"
										fill="var(--crema)"
										stroke="var(--crema)"
										strokeWidth="2"
										aria-hidden="true"
										focusable="false"
										className="shrink-0"
									>
										<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
									</svg>
									<div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-(--sand)/20">
										<div className="h-full rounded-full bg-(--crema) transition-all" style={{ width: `${pct}%` }} />
									</div>
									<span className="w-5 shrink-0 text-right font-medium text-(--espresso)">{count}</span>
								</div>
							);
						})}
					</div>
				) : null}
			</Card>

			<Card className="space-y-4 p-4">
				<div className="flex flex-wrap items-end gap-3">
					<div className="w-full min-w-42 max-w-56 space-y-1">
						<label htmlFor="reviews-sort" className="text-xs font-semibold uppercase tracking-wide text-(--muted)">
							{m("brew.reviewsSortLabel")}
						</label>
						<Select id="reviews-sort" value={sort} onChange={(event) => setSort(event.currentTarget.value as ReviewSort)}>
							<option value="newest">{m("brew.reviewsSortNewest")}</option>
							<option value="oldest">{m("brew.reviewsSortOldest")}</option>
							<option value="highest">{m("brew.reviewsSortHighest")}</option>
							<option value="lowest">{m("brew.reviewsSortLowest")}</option>
						</Select>
					</div>
					<div className="w-full min-w-42 max-w-56 space-y-1">
						<label htmlFor="reviews-filter" className="text-xs font-semibold uppercase tracking-wide text-(--muted)">
							{m("brew.reviewsFilterLabel")}
						</label>
						<Select
							id="reviews-filter"
							value={starFilter}
							onChange={(event) => setStarFilter(event.currentTarget.value as ReviewStarFilter)}
						>
							<option value="all">{m("brew.reviewsFilterAll")}</option>
							<option value="5">{getStarFilterLabel("5", locale)}</option>
							<option value="4">{getStarFilterLabel("4", locale)}</option>
							<option value="3">{getStarFilterLabel("3", locale)}</option>
							<option value="2">{getStarFilterLabel("2", locale)}</option>
							<option value="1">{getStarFilterLabel("1", locale)}</option>
						</Select>
					</div>
				</div>
			</Card>

			{reviews.length === 0 ? (
				<Card>
					<p className="text-sm text-(--muted)">{m("brew.noReviews")}</p>
				</Card>
			) : visibleReviews.length === 0 ? (
				<Card>
					<p className="text-sm text-(--muted)">{m("brew.noReviewsMatchFilter")}</p>
				</Card>
			) : (
				visibleReviews.map((review) => {
					const plainNotes = clampText(toPlainText(review.notes), 360);
					const reviewDimensions = [
						{ label: m("dim.acidity"), value: review.acidity },
						{ label: m("dim.sweetness"), value: review.sweetness },
						{ label: m("dim.body"), value: review.body },
						{ label: m("dim.aroma"), value: review.aroma },
						{ label: m("dim.balance"), value: review.balance },
					];

					return (
						<Card key={`${review.reviewer_id}-${review.updated_at}`} className="space-y-3">
							<div className="flex items-start justify-between gap-3">
								<div className="flex min-w-0 items-start gap-3">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--sand)/25 text-sm font-semibold text-(--espresso)">
										{review.reviewer.avatarUrl ? (
											<Image
												src={review.reviewer.avatarUrl}
												alt={review.reviewer.displayName}
												width={40}
												height={40}
												className="h-full w-full object-cover"
											/>
										) : (
											review.reviewer.displayName.charAt(0).toUpperCase()
										)}
									</div>
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-1.5">
											<Link href={`/users/${review.reviewer.userId}`} className="font-semibold text-(--espresso) hover:underline">
												{review.reviewer.displayName}
											</Link>
											{review.reviewer.badge ? (
												<span className="rounded-full border border-(--border) bg-(--sand)/25 px-1.5 py-0.5 text-[10px] font-medium text-(--muted)">
													{review.reviewer.badge}
												</span>
											) : null}
											{review.reviewer.mentionHandle ? (
												<span className="rounded-full border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] text-(--muted)">
													@{review.reviewer.mentionHandle}
												</span>
											) : null}
										</div>
										<p className="mt-1 text-xs text-(--muted)">
											{review.reviewer.totalReviews} {m("compare.reviews")} - Karma {review.reviewer.karma}
										</p>
									</div>
								</div>
								{review.star_rating != null ? (
									<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--crema)/15 px-2.5 py-1 text-sm font-semibold text-(--accent)">
										<svg
											width="13"
											height="13"
											viewBox="0 0 24 24"
											fill="var(--crema)"
											stroke="var(--crema)"
											strokeWidth="2"
											aria-hidden="true"
											focusable="false"
										>
											<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
										</svg>
										{review.star_rating}/5
									</span>
								) : null}
							</div>

							<div className="flex flex-wrap gap-2">
								{reviewDimensions.map(({ label, value }) => (
									<span key={label} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
										<span className="text-(--muted)">{label}</span>
										<span className="font-semibold text-(--espresso)">{value}/5</span>
									</span>
								))}
							</div>

							{plainNotes ? <p className="text-sm text-(--muted)">{plainNotes}</p> : null}
							<p className="text-xs text-(--muted)">
								{m("brew.updated")} {formatDate(review.updated_at, locale)}
							</p>
						</Card>
					);
				})
			)}
		</section>
	);
}
