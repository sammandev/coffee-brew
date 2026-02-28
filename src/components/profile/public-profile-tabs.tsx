"use client";

import { Coffee, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ForumReactionType } from "@/lib/constants";
import { FORUM_REACTION_TYPES } from "@/lib/constants";
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

interface PublicProfileTabsProps {
	blogs: BlogListItem[];
	brews: BrewListItem[];
	locale: "en" | "id";
	showStatuses: boolean;
	threads: ThreadListItem[];
}

type TabId = "brews" | "blogs" | "threads";

export function PublicProfileTabs({ blogs, brews, locale, showStatuses, threads }: PublicProfileTabsProps) {
	const [activeTab, setActiveTab] = useState<TabId>("brews");

	return (
		<section className="space-y-4">
			<div className="inline-flex rounded-xl border bg-(--surface) p-1">
				<button
					type="button"
					onClick={() => setActiveTab("brews")}
					className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === "brews" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
				>
					<Coffee size={15} />
					{locale === "id" ? "Brew" : "Brews"}
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("blogs")}
					className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === "blogs" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
				>
					<FileText size={15} />
					Blog
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("threads")}
					className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${activeTab === "threads" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
				>
					<MessageSquare size={15} />
					{locale === "id" ? "Thread" : "Threads"}
				</button>
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
											{reactionType === "like" ? "👍" : reactionType === "coffee" ? "☕" : reactionType === "fire" ? "🔥" : "🤯"}{" "}
											{thread.reaction_counts[reactionType] ?? 0}
										</span>
									))}
								</div>
							</Card>
						))
					)}
				</div>
			) : null}
		</section>
	);
}
