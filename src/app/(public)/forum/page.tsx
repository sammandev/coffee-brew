import { MessageSquare, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ForumBreadcrumbs } from "@/components/forum/forum-breadcrumbs";
import { ForumLiveAutoRefresh } from "@/components/forum/forum-live-auto-refresh";
import { ThreadComposerModal } from "@/components/forum/thread-composer-modal";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { buildReactionCountMap } from "@/lib/forum";
import { getServerI18n } from "@/lib/i18n/server";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

interface ForumPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
	title: "Forum | Coffee Brew",
	description: "Browse coffee discussion categories, sub-forums, and recent community threads.",
};

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

interface ThreadRow {
	id: string;
	title: string;
	content: string;
	tags: string[];
	author_id: string;
	subforum_id: string;
	created_at: string;
	updated_at: string;
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
	const [{ locale, t }, session, params] = await Promise.all([getServerI18n(), getSessionContext(), searchParams]);
	const q = firstParam(params.q).trim().toLowerCase();
	const supabase = createSupabaseAdminClient();

	const [{ data: categories }, { data: subforums }, { data: threads }] = await Promise.all([
		supabase
			.from("forum_categories")
			.select("id, slug, name_en, name_id, description_en, description_id, order_index")
			.eq("is_visible", true)
			.order("order_index", { ascending: true }),
		supabase
			.from("forum_subforums")
			.select("id, category_id, slug, name_en, name_id, description_en, description_id, order_index")
			.eq("is_visible", true)
			.order("order_index", { ascending: true }),
		supabase
			.from("forum_threads")
			.select("id, title, content, tags, author_id, subforum_id, created_at, updated_at")
			.eq("status", "visible")
			.is("deleted_at", null)
			.order("is_pinned", { ascending: false })
			.order("updated_at", { ascending: false })
			.limit(80),
	]);

	const categoryRows = categories ?? [];
	const subforumRows = subforums ?? [];
	const threadRows = (threads ?? []) as ThreadRow[];
	const threadIds = threadRows.map((thread) => thread.id);
	const authorIds = Array.from(new Set(threadRows.map((thread) => thread.author_id)));

	const [{ data: reactions }, { data: comments }, { data: authors }, { data: userBadges }] = await Promise.all([
		threadIds.length > 0
			? supabase
					.from("forum_reactions")
					.select("target_id, reaction")
					.eq("target_type", "thread")
					.in("target_id", threadIds)
			: Promise.resolve({ data: [] as Array<{ target_id: string; reaction: ForumReactionType }> }),
		threadIds.length > 0
			? supabase.from("forum_comments").select("thread_id, id").eq("status", "visible").in("thread_id", threadIds)
			: Promise.resolve({ data: [] as Array<{ thread_id: string; id: string }> }),
		authorIds.length > 0
			? supabase.from("profiles").select("id, display_name, email, is_verified, karma_points").in("id", authorIds)
			: Promise.resolve({
					data: [] as Array<{
						id: string;
						display_name: string | null;
						email: string | null;
						is_verified: boolean;
						karma_points: number;
					}>,
				}),
		authorIds.length > 0
			? supabase.from("user_badges").select("user_id, badge_definitions(label_en, label_id)").in("user_id", authorIds)
			: Promise.resolve({
					data: [] as Array<{
						user_id: string;
						badge_definitions: { label_en: string; label_id: string } | null;
					}>,
				}),
	]);

	const authorById = new Map(
		(authors ?? []).map((author) => [
			author.id,
			{
				name: author.display_name?.trim() || author.email || "Unknown User",
				verified: Boolean(author.is_verified),
				karma: Number(author.karma_points ?? 0),
			},
		]),
	);
	const topBadgeByUserId = new Map<string, string>();
	for (const row of userBadges ?? []) {
		const badgeDefinition = Array.isArray(row.badge_definitions) ? row.badge_definitions[0] : row.badge_definitions;
		if (!badgeDefinition) continue;
		if (topBadgeByUserId.has(row.user_id)) continue;
		topBadgeByUserId.set(row.user_id, locale === "id" ? badgeDefinition.label_id : badgeDefinition.label_en);
	}
	const reactionRowsByThreadId = new Map<string, Array<{ reaction: ForumReactionType }>>();
	for (const reaction of reactions ?? []) {
		const current = reactionRowsByThreadId.get(reaction.target_id) ?? [];
		current.push({ reaction: reaction.reaction });
		reactionRowsByThreadId.set(reaction.target_id, current);
	}
	const commentCountByThreadId = new Map<string, number>();
	for (const comment of comments ?? []) {
		commentCountByThreadId.set(comment.thread_id, (commentCountByThreadId.get(comment.thread_id) ?? 0) + 1);
	}
	const threadCountBySubforum = new Map<string, number>();
	for (const thread of threadRows) {
		threadCountBySubforum.set(thread.subforum_id, (threadCountBySubforum.get(thread.subforum_id) ?? 0) + 1);
	}

	const filteredThreads = threadRows.filter((thread) => {
		if (!q) return true;
		return `${thread.title} ${clampPlainText(thread.content, 8000)}`.toLowerCase().includes(q);
	});

	return (
		<div className="space-y-6">
			<ForumLiveAutoRefresh
				tableFilters={[{ table: "forum_threads" }, { table: "forum_comments" }, { table: "forum_reactions" }]}
			/>

			<header className="space-y-3">
				<ForumBreadcrumbs items={[{ href: "/", label: t("nav.home") }, { label: t("nav.forum") }]} />
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="font-heading text-4xl text-(--espresso)">{t("nav.forum")}</h1>
					{session ? (
						<ThreadComposerModal
							title={t("forum.startDiscussion")}
							description={
								locale === "id"
									? "Mulai thread baru di sub-forum yang paling relevan."
									: "Start a new thread in the most relevant sub-forum."
							}
							triggerLabel={locale === "id" ? "Mulai Diskusi" : "Start Discussion"}
							subforums={subforumRows}
							initialSubforumId={subforumRows[0]?.id}
						/>
					) : (
						<Link
							href="/login"
							className="rounded-full border px-4 py-2 text-sm font-semibold text-(--accent) hover:bg-(--sand)/15"
						>
							{t("forum.loginToPost")}
						</Link>
					)}
				</div>
				<p className="text-(--muted)">{t("forum.subtitle")}</p>
				<form action="/forum" className="flex items-center gap-2">
					<input
						name="q"
						defaultValue={q}
						placeholder={locale === "id" ? "Cari thread terbaru..." : "Search recent threads..."}
						className="h-9 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-sm"
					/>
					<button
						type="submit"
						className="h-9 rounded-lg border border-(--border) bg-(--surface-elevated) px-3 text-sm font-semibold"
					>
						{locale === "id" ? "Cari" : "Search"}
					</button>
				</form>
			</header>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-(--espresso)">
					{locale === "id" ? "Kategori & Sub-Forum" : "Categories & Sub-forums"}
				</h2>
				<div className="grid gap-4 md:grid-cols-2">
					{categoryRows.map((category) => (
						<Card key={category.id} className="space-y-3">
							<div>
								<CardTitle>{locale === "id" ? category.name_id : category.name_en}</CardTitle>
								<CardDescription>
									{locale === "id"
										? (category.description_id ?? category.description_en ?? "")
										: (category.description_en ?? category.description_id ?? "")}
								</CardDescription>
							</div>
							<div className="space-y-2">
								{subforumRows
									.filter((subforum) => subforum.category_id === category.id)
									.map((subforum) => (
										<Link
											key={subforum.id}
											href={`/forum/f/${subforum.slug}`}
											className="flex items-center justify-between rounded-xl border bg-(--surface) px-3 py-2 transition hover:bg-(--sand)/15"
										>
											<span className="text-sm font-semibold text-(--espresso)">
												{locale === "id" ? subforum.name_id : subforum.name_en}
											</span>
											<span className="text-xs text-(--muted)">{threadCountBySubforum.get(subforum.id) ?? 0}</span>
										</Link>
									))}
							</div>
						</Card>
					))}
				</div>
			</section>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-(--espresso)">
					{locale === "id" ? "Aktivitas Terbaru" : "Recent Activity"}
				</h2>
				<div className="space-y-3">
					{filteredThreads.map((thread) => {
						const reactionCounts = buildReactionCountMap(reactionRowsByThreadId.get(thread.id) ?? []);
						const author = authorById.get(thread.author_id) ?? { name: "Unknown User", verified: false, karma: 0 };
						return (
							<Card key={thread.id} className="transition hover:-translate-y-1">
								<Link href={`/forum/${thread.id}`} className="block">
									<CardTitle>{thread.title}</CardTitle>
									{Array.isArray(thread.tags) && thread.tags.length > 0 ? (
										<div className="mt-2 flex flex-wrap gap-2">
											{thread.tags.slice(0, 5).map((tag) => (
												<span key={`${thread.id}-${tag}`} className="rounded-full border px-2 py-0.5 text-xs text-(--muted)">
													#{tag}
												</span>
											))}
										</div>
									) : null}
									<CardDescription className="mt-2 line-clamp-2">{clampPlainText(thread.content, 180)}</CardDescription>
								</Link>
								<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-(--muted)">
									<span className="inline-flex items-center gap-1">
										<UserRound size={13} />
										<Link href={`/users/${thread.author_id}`} className="font-semibold hover:text-(--espresso)">
											{author.name}
										</Link>
										{author.verified ? <span className="rounded-full border px-1 text-[10px]">✓</span> : null}
										{topBadgeByUserId.get(thread.author_id) ? (
											<span className="rounded-full border px-1.5 text-[10px]">{topBadgeByUserId.get(thread.author_id)}</span>
										) : null}
										<span>{locale === "id" ? `Karma ${author.karma}` : `Karma ${author.karma}`}</span>
									</span>
									<span className="inline-flex items-center gap-1">
										<MessageSquare size={13} />
										{commentCountByThreadId.get(thread.id) ?? 0}
									</span>
								</div>
								<div className="mt-2 flex flex-wrap gap-2 text-xs">
									{FORUM_REACTION_TYPES.map((reactionType) => (
										<span key={`${thread.id}-${reactionType}`} className="rounded-full border px-2 py-0.5 text-(--muted)">
											{reactionType === "like" ? "👍" : reactionType === "coffee" ? "☕" : reactionType === "fire" ? "🔥" : "🤯"}{" "}
											{reactionCounts[reactionType] ?? 0}
										</span>
									))}
								</div>
								<p className="mt-2 text-xs text-(--muted)">
									{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(thread.updated_at, locale)}
								</p>
							</Card>
						);
					})}
					{filteredThreads.length === 0 ? (
						<Card>
							<p className="text-sm text-(--muted)">
								{locale === "id" ? "Belum ada thread untuk filter ini." : "No threads matched your filters."}
							</p>
						</Card>
					) : null}
				</div>
			</section>
		</div>
	);
}
