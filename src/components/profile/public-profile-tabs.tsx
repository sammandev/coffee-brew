import { Coffee, FileText, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserIdentitySummary } from "@/components/user/user-identity-summary";
import type { ForumReactionType } from "@/lib/constants";
import { FORUM_REACTION_TYPES, REACTION_EMOJI } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface BrewListItem {
	id: string;
	name: string;
	brew_method: string;
	created_at: string;
	rating_avg: number;
	review_count: number;
	status: string;
}

interface BlogListItem {
	id: string;
	slug: string;
	title_en: string;
	title_id: string;
	status: string;
	published_at: string | null;
	updated_at: string;
}

interface ThreadListItem {
	id: string;
	title: string;
	status: string;
	created_at: string;
	updated_at: string;
	reaction_counts: Partial<Record<ForumReactionType, number>>;
}

interface ReviewListItem {
	brew_id: string;
	brew_name: string;
	id: string;
	identity_avatar_url: string | null;
	identity_badge: string | null;
	identity_display_name: string;
	identity_is_verified: boolean;
	identity_joined_at: string;
	identity_karma: number;
	identity_mention_handle: string | null;
	identity_total_reviews: number;
	identity_user_id: string;
	notes_preview: string;
	overall: number;
	updated_at: string;
}

interface PublicProfileTabsProps {
	activeReviewsTab: ReviewsTabId;
	activeTab: TabId;
	blogs: BlogListItem[];
	basePath: string;
	brews: BrewListItem[];
	locale: "en" | "id";
	reviewsGiven: ReviewListItem[];
	reviewsReceived: ReviewListItem[];
	showStatuses: boolean;
	threads: ThreadListItem[];
}

type ReviewsTabId = "received" | "given";
type TabId = "brews" | "blogs" | "threads" | "reviews";

function buildTabHref(basePath: string, tab: TabId, reviewsTab: ReviewsTabId) {
	const params = new URLSearchParams();
	params.set("tab", tab);
	if (tab === "reviews") {
		params.set("reviews", reviewsTab);
	}
	return `${basePath}?${params.toString()}`;
}

function ReviewList({ items, locale, title }: { items: ReviewListItem[]; locale: "en" | "id"; title: string }) {
	return (
		<div className="space-y-3">
			<h3 className="text-sm font-semibold text-(--espresso)">{title}</h3>
			{items.length === 0 ? (
				<Card>
					<p className="text-sm text-(--muted)">
						{locale === "id" ? "Belum ada review pada kategori ini." : "No reviews in this category yet."}
					</p>
				</Card>
			) : (
				items.map((review) => (
					<Card key={review.id} className="space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Link href={`/brew/${review.brew_id}`} className="font-semibold text-(--espresso) hover:underline">
								{review.brew_name}
							</Link>
							<span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
								<Star size={14} />
								{review.overall.toFixed(2)}
							</span>
						</div>
						<UserIdentitySummary
							userId={review.identity_user_id}
							displayName={review.identity_display_name}
							avatarUrl={review.identity_avatar_url}
							joinedAt={review.identity_joined_at}
							karma={review.identity_karma}
							totalReviews={review.identity_total_reviews}
							locale={locale}
							variant="compact"
							hideJoined
							isVerified={review.identity_is_verified}
							mentionHandle={review.identity_mention_handle}
							badges={review.identity_badge ? [review.identity_badge] : []}
						/>
						{review.notes_preview ? <p className="line-clamp-2 text-sm text-(--muted)">{review.notes_preview}</p> : null}
						<p className="text-xs text-(--muted)">
							{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(review.updated_at, locale)}
						</p>
					</Card>
				))
			)}
		</div>
	);
}

export function PublicProfileTabs({
	activeReviewsTab,
	activeTab,
	blogs,
	basePath,
	brews,
	locale,
	reviewsGiven,
	reviewsReceived,
	showStatuses,
	threads,
}: PublicProfileTabsProps) {
	return (
		<section className="space-y-4">
			<div className="inline-flex flex-wrap rounded-xl border bg-(--surface) p-1">
				<Link
					href={buildTabHref(basePath, "brews", activeReviewsTab)}
					className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === "brews" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
				>
					<Coffee size={15} />
					{locale === "id" ? "Brew" : "Brews"}
				</Link>
				<Link
					href={buildTabHref(basePath, "blogs", activeReviewsTab)}
					className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === "blogs" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
				>
					<FileText size={15} />
					Blog
				</Link>
				<Link
					href={buildTabHref(basePath, "threads", activeReviewsTab)}
					className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === "threads" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
				>
					<MessageSquare size={15} />
					{locale === "id" ? "Thread" : "Threads"}
				</Link>
				<Link
					href={buildTabHref(basePath, "reviews", activeReviewsTab)}
					className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === "reviews" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
				>
					<Star size={15} />
					{locale === "id" ? "Review" : "Reviews"}
				</Link>
			</div>

			{activeTab === "brews" ? (
				<div className="grid gap-3">
					{brews.length === 0 ? (
						<Card>
							<p className="text-sm text-(--muted)">{locale === "id" ? "Belum ada brew." : "No brews yet."}</p>
						</Card>
					) : (
						brews.map((brew) => (
							<Card key={brew.id} className="space-y-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Link href={`/brew/${brew.id}`} className="font-semibold text-(--espresso) hover:underline">
										{brew.name}
									</Link>
									{showStatuses ? <Badge>{brew.status}</Badge> : null}
								</div>
								<p className="text-sm text-(--muted)">
									{brew.brew_method} · {locale === "id" ? "Dibuat" : "Created"} {formatDate(brew.created_at, locale)}
								</p>
								<p className="text-sm text-(--muted)">
									{locale === "id" ? "Rating" : "Rating"}: {brew.rating_avg.toFixed(2)} ({brew.review_count}{" "}
									{locale === "id" ? "review" : "reviews"})
								</p>
							</Card>
						))
					)}
				</div>
			) : null}

			{activeTab === "blogs" ? (
				<div className="grid gap-3">
					{blogs.length === 0 ? (
						<Card>
							<p className="text-sm text-(--muted)">{locale === "id" ? "Belum ada blog." : "No blog posts yet."}</p>
						</Card>
					) : (
						blogs.map((blog) => (
							<Card key={blog.id} className="space-y-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Link href={`/blog/${blog.slug}`} className="font-semibold text-(--espresso) hover:underline">
										{locale === "id" ? blog.title_id : blog.title_en}
									</Link>
									{showStatuses ? <Badge>{blog.status}</Badge> : null}
								</div>
								<p className="text-sm text-(--muted)">
									{blog.published_at
										? `${locale === "id" ? "Dipublikasi" : "Published"} ${formatDate(blog.published_at, locale)}`
										: `${locale === "id" ? "Diperbarui" : "Updated"} ${formatDate(blog.updated_at, locale)}`}
								</p>
							</Card>
						))
					)}
				</div>
			) : null}

			{activeTab === "threads" ? (
				<div className="grid gap-3">
					{threads.length === 0 ? (
						<Card>
							<p className="text-sm text-(--muted)">{locale === "id" ? "Belum ada thread." : "No threads yet."}</p>
						</Card>
					) : (
						threads.map((thread) => (
							<Card key={thread.id} className="space-y-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Link href={`/forum/${thread.id}`} className="font-semibold text-(--espresso) hover:underline">
										{thread.title}
									</Link>
									{showStatuses ? <Badge>{thread.status}</Badge> : null}
								</div>
								<p className="text-sm text-(--muted)">
									{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(thread.updated_at, locale)}
								</p>
								<div className="flex flex-wrap gap-2 text-xs">
									{FORUM_REACTION_TYPES.map((reactionType) => (
										<span key={`${thread.id}-${reactionType}`} className="rounded-full border px-2 py-0.5 text-(--muted)">
											{REACTION_EMOJI[reactionType]} {thread.reaction_counts[reactionType] ?? 0}
										</span>
									))}
								</div>
							</Card>
						))
					)}
				</div>
			) : null}

			{activeTab === "reviews" ? (
				<div className="space-y-3">
					<div className="inline-flex rounded-xl border bg-(--surface) p-1">
						<Link
							href={buildTabHref(basePath, "reviews", "received")}
							className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold ${activeReviewsTab === "received" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
						>
							{locale === "id" ? "Diterima" : "Received"}
						</Link>
						<Link
							href={buildTabHref(basePath, "reviews", "given")}
							className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold ${activeReviewsTab === "given" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
						>
							{locale === "id" ? "Diberikan" : "Given"}
						</Link>
					</div>
					{activeReviewsTab === "received" ? (
						<ReviewList
							items={reviewsReceived}
							locale={locale}
							title={locale === "id" ? "Review yang diterima" : "Reviews received"}
						/>
					) : (
						<ReviewList
							items={reviewsGiven}
							locale={locale}
							title={locale === "id" ? "Review yang diberikan" : "Reviews given"}
						/>
					)}
				</div>
			) : null}
		</section>
	);
}
