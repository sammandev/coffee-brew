import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ForumBreadcrumbs } from "@/components/forum/forum-breadcrumbs";
import { ForumLiveAutoRefresh } from "@/components/forum/forum-live-auto-refresh";
import { ForumSearchControls } from "@/components/forum/forum-search-controls";
import { ThreadComposerModal } from "@/components/forum/thread-composer-modal";
import { Badge } from "@/components/ui/badge";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType, REACTION_EMOJI } from "@/lib/constants";
import { buildReactionCountMap } from "@/lib/forum";
import { getServerI18n } from "@/lib/i18n/server";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveUserDisplayName } from "@/lib/user-identity";
import { formatDate } from "@/lib/utils";

interface ForumPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
	title: "Forum",
	description: "Browse coffee discussion categories, sub-forums, and recent community threads.",
};

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
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
	is_pinned: boolean;
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
	const [{ locale, t }, session, params] = await Promise.all([getServerI18n(), getSessionContext(), searchParams]);
	const q = firstParam(params.q).trim().toLowerCase();
	const tag = firstParam(params.tag).trim().toLowerCase();
	const author = firstParam(params.author).trim().toLowerCase();
	const from = firstParam(params.from).trim();
	const to = firstParam(params.to).trim();
	const minReactionsRaw = firstParam(params.minReactions).trim();
	const sort = firstParam(params.sort).trim() || "latest";
	const discussBrewId = firstParam(params.discussBrewId).trim();
	const minReactions = Number.isFinite(Number(minReactionsRaw)) ? Math.max(0, Number(minReactionsRaw)) : 0;
	const supabase = createSupabaseAdminClient();

	const [{ data: categories }, { data: subforums }, { data: threads }, { data: discussBrew }] = await Promise.all([
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
			.select("id, title, content, tags, author_id, subforum_id, created_at, updated_at, is_pinned")
			.eq("status", "visible")
			.is("deleted_at", null)
			.order("is_pinned", { ascending: false })
			.order("updated_at", { ascending: false })
			.limit(80),
		discussBrewId
			? supabase
					.from("brews")
					.select("id, name, brew_method, coffee_beans, brand_roastery, tags, status")
					.eq("id", discussBrewId)
					.eq("status", "published")
					.maybeSingle<{
						id: string;
						name: string;
						brew_method: string;
						coffee_beans: string;
						brand_roastery: string;
						tags: string[] | null;
						status: string;
					}>()
			: Promise.resolve({
					data: null as {
						id: string;
						name: string;
						brew_method: string;
						coffee_beans: string;
						brand_roastery: string;
						tags: string[] | null;
						status: string;
					} | null,
				}),
	]);

	const categoryRows = categories ?? [];
	const subforumRows = subforums ?? [];
	const threadRows = (threads ?? []) as ThreadRow[];
	const threadIds = threadRows.map((thread) => thread.id);
	const subforumIds = subforumRows.map((subforum) => subforum.id);
	const authorIds = Array.from(new Set(threadRows.map((thread) => thread.author_id)));

	const [{ data: reactions }, { data: commentTotals }, { data: subforumTotals }, { data: authors }] = await Promise.all([
		threadIds.length > 0
			? supabase
					.from("forum_reactions")
					.select("target_id, reaction")
					.eq("target_type", "thread")
					.in("target_id", threadIds)
			: Promise.resolve({ data: [] as Array<{ target_id: string; reaction: ForumReactionType }> }),
		threadIds.length > 0
			? supabase.rpc("get_forum_thread_comment_totals", { thread_ids: threadIds })
			: Promise.resolve({ data: [] as Array<{ thread_id: string; comment_total: number }> }),
		subforumIds.length > 0
			? supabase.rpc("get_forum_subforum_thread_totals", { subforum_ids: subforumIds })
			: Promise.resolve({ data: [] as Array<{ subforum_id: string; thread_total: number }> }),
		authorIds.length > 0
			? supabase.from("profiles").select("id, display_name, email, avatar_url, mention_handle").in("id", authorIds)
			: Promise.resolve({
					data: [] as Array<{
						id: string;
						display_name: string | null;
						email: string | null;
						avatar_url: string | null;
						mention_handle: string | null;
					}>,
				}),
	]);

	const authorById = new Map(
		(authors ?? []).map((author) => [
			author.id,
			{
				avatarUrl: author.avatar_url,
				name: resolveUserDisplayName(author),
			},
		]),
	);
	const reactionRowsByThreadId = new Map<string, Array<{ reaction: ForumReactionType }>>();
	for (const reaction of reactions ?? []) {
		const current = reactionRowsByThreadId.get(reaction.target_id) ?? [];
		current.push({ reaction: reaction.reaction });
		reactionRowsByThreadId.set(reaction.target_id, current);
	}
	const commentCountByThreadId = new Map<string, number>();
	for (const row of (commentTotals ?? []) as Array<{ thread_id: string; comment_total: number }>) {
		commentCountByThreadId.set(row.thread_id, Number(row.comment_total ?? 0));
	}
	const threadCountBySubforum = new Map<string, number>();
	for (const row of (subforumTotals ?? []) as Array<{ subforum_id: string; thread_total: number }>) {
		threadCountBySubforum.set(row.subforum_id, Number(row.thread_total ?? 0));
	}

	const tagCounts = new Map<string, number>();
	for (const thread of threadRows) {
		for (const rawTag of thread.tags ?? []) {
			const normalized = String(rawTag ?? "")
				.trim()
				.toLowerCase();
			if (!normalized) continue;
			tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
		}
	}
	const popularTags = Array.from(tagCounts.entries())
		.sort((left, right) => right[1] - left[1])
		.slice(0, 12)
		.map(([value]) => value);

	const filteredThreads = threadRows.filter((thread) => {
		if (q && !`${thread.title} ${clampPlainText(thread.content, 8000)}`.toLowerCase().includes(q)) return false;
		if (tag && !(thread.tags ?? []).some((row) => row.trim().toLowerCase() === tag)) return false;
		if (author) {
			const authorInfo = authorById.get(thread.author_id);
			const authorName = (authorInfo?.name || "").toLowerCase();
			if (!authorName.includes(author)) return false;
		}
		if (from && new Date(thread.created_at).getTime() < new Date(from).getTime()) return false;
		if (to && new Date(thread.created_at).getTime() > new Date(to).getTime()) return false;
		if (minReactions > 0) {
			const count = (reactionRowsByThreadId.get(thread.id) ?? []).length;
			if (count < minReactions) return false;
		}
		return true;
	});

	const sortedThreads = [...filteredThreads].sort((left, right) => {
		const leftReactionCount = (reactionRowsByThreadId.get(left.id) ?? []).length;
		const rightReactionCount = (reactionRowsByThreadId.get(right.id) ?? []).length;
		const leftCommentCount = commentCountByThreadId.get(left.id) ?? 0;
		const rightCommentCount = commentCountByThreadId.get(right.id) ?? 0;

		if (sort === "oldest") {
			return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
		}
		if (sort === "most_reacted") {
			if (rightReactionCount !== leftReactionCount) return rightReactionCount - leftReactionCount;
			return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
		}
		if (sort === "most_discussed") {
			if (rightCommentCount !== leftCommentCount) return rightCommentCount - leftCommentCount;
			return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
		}
		return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
	});
	const discussPrefill =
		session && discussBrew
			? {
					title: locale === "id" ? `Diskusi Brew: ${discussBrew.name}` : `Brew Discussion: ${discussBrew.name}`,
					content: `<p>${
						locale === "id" ? "Saya ingin membahas profil brew ini:" : "I want to discuss this brew profile:"
					}</p><ul><li><strong>${escapeHtml(discussBrew.name)}</strong></li><li>${escapeHtml(
						discussBrew.brew_method,
					)}</li><li>${escapeHtml(discussBrew.coffee_beans)}</li><li>${escapeHtml(
						discussBrew.brand_roastery,
					)}</li></ul><p><a href="/brew/${discussBrew.id}">${
						locale === "id" ? "Lihat detail brew" : "View brew detail"
					}</a></p>`,
					tags: Array.isArray(discussBrew.tags) ? discussBrew.tags.slice(0, 5) : [],
				}
			: null;

	const totalReactions = (id: string) => (reactionRowsByThreadId.get(id) ?? []).length;

	return (
		<div className="space-y-8">
			<ForumLiveAutoRefresh
				tableFilters={[{ table: "forum_threads" }, { table: "forum_comments" }, { table: "forum_reactions" }]}
			/>

			{/* Header */}
			<header className="space-y-4">
				<ForumBreadcrumbs items={[{ href: "/", label: t("nav.home") }, { label: t("nav.forum") }]} />
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<Badge>{t("nav.forum")}</Badge>
						<h1 className="font-heading text-4xl text-(--espresso)">{t("forum.title")}</h1>
						<p className="max-w-2xl text-(--muted)">{t("forum.heroDescription")}</p>
						<div className="flex flex-wrap gap-4 pt-1 text-sm text-(--muted)">
							<span className="inline-flex items-center gap-1.5">
								<MessageSquare size={14} />
								<span className="font-semibold text-(--espresso)">{sortedThreads.length}</span> {t("forum.discussions")}
							</span>
							<span className="inline-flex items-center gap-1.5">
								☕ <span className="font-semibold text-(--espresso)">{categoryRows.length}</span>{" "}
								{locale === "id" ? "kategori" : "categories"}
							</span>
							<span className="inline-flex items-center gap-1.5">
								💬 <span className="font-semibold text-(--espresso)">{subforumRows.length}</span>{" "}
								{locale === "id" ? "sub-forum" : "sub-forums"}
							</span>
						</div>
					</div>
					{session ? (
						<ThreadComposerModal
							title={t("forum.startDiscussion")}
							description={t("forum.startDiscussionDesc")}
							triggerLabel={t("forum.startDiscussion")}
							subforums={subforumRows}
							initialSubforumId={subforumRows[0]?.id}
							openOnMount={Boolean(discussPrefill)}
							initialTitle={discussPrefill?.title}
							initialContent={discussPrefill?.content}
							initialTags={discussPrefill?.tags}
						/>
					) : (
						<Link
							href="/login"
							className="inline-flex items-center gap-2 rounded-full bg-(--espresso) px-5 py-2.5 text-sm font-semibold text-(--oat) shadow-sm transition hover:opacity-90"
						>
							{t("forum.loginToPost")}
						</Link>
					)}
				</div>
			</header>

			{/* Search Controls */}
			<ForumSearchControls
				initialQuery={q}
				initialTag={tag}
				initialAuthor={author}
				initialMinReactions={minReactionsRaw}
				initialSort={sort}
				initialFrom={from}
				initialTo={to}
				locale={locale}
				popularTags={popularTags}
			/>

			{/* Categories & Subforums */}
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-heading text-xl text-(--espresso) sm:text-2xl">{t("forum.categoriesTitle")}</h2>
						<p className="text-sm text-(--muted)">{t("forum.categoriesSubtitle")}</p>
					</div>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{categoryRows.map((category) => {
						const catSubforums = subforumRows.filter((sf) => sf.category_id === category.id);
						const catThreadCount = catSubforums.reduce((sum, sf) => sum + (threadCountBySubforum.get(sf.id) ?? 0), 0);
						return (
							<div
								key={category.id}
								className="group rounded-2xl border bg-(--surface-elevated) p-5 transition hover:shadow-md"
							>
								<div className="mb-3 flex items-start justify-between">
									<div>
										<h3 className="font-heading text-base font-semibold text-(--espresso)">
											{locale === "id" ? category.name_id : category.name_en}
										</h3>
										<p className="mt-0.5 text-xs text-(--muted) line-clamp-2">
											{locale === "id"
												? (category.description_id ?? category.description_en ?? "")
												: (category.description_en ?? category.description_id ?? "")}
										</p>
									</div>
									<span className="shrink-0 rounded-full bg-(--accent)/10 px-2.5 py-0.5 text-xs font-semibold text-(--accent)">
										{catThreadCount} {t("forum.threadCount")}
									</span>
								</div>
								<div className="space-y-1.5">
									{catSubforums.map((subforum) => (
										<Link
											key={subforum.id}
											href={`/forum/f/${subforum.slug}`}
											className="flex items-center justify-between rounded-xl bg-(--surface) px-3 py-2.5 transition hover:bg-(--sand)/15"
										>
											<div className="flex items-center gap-2">
												<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--accent)/10 text-xs">💬</span>
												<span className="text-sm font-medium text-(--espresso)">
													{locale === "id" ? subforum.name_id : subforum.name_en}
												</span>
											</div>
											<span className="rounded-full bg-(--sand)/20 px-2 py-0.5 text-xs text-(--muted)">
												{threadCountBySubforum.get(subforum.id) ?? 0}
											</span>
										</Link>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* Recent Discussions */}
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-heading text-xl text-(--espresso) sm:text-2xl">{t("forum.recentActivity")}</h2>
						<p className="text-sm text-(--muted)">{t("forum.recentSubtitle")}</p>
					</div>
					{sortedThreads.length > 0 ? (
						<span className="rounded-full bg-(--accent)/10 px-3 py-1 text-xs font-semibold text-(--accent)">
							{sortedThreads.length} {t("forum.resultsCount")}
						</span>
					) : null}
				</div>

				<div className="space-y-3">
					{sortedThreads.map((thread) => {
						const reactionCounts = buildReactionCountMap(reactionRowsByThreadId.get(thread.id) ?? []);
						const threadAuthor = authorById.get(thread.author_id) ?? {
							avatarUrl: null,
							name: "Unknown User",
						};
						const commentCount = commentCountByThreadId.get(thread.id) ?? 0;
						const reactionTotal = totalReactions(thread.id);
						return (
							<Link key={thread.id} href={`/forum/${thread.id}`} className="group block">
								<div className="rounded-2xl border bg-(--surface-elevated) p-4 transition group-hover:shadow-md group-hover:border-(--accent)/30 sm:p-5">
									<div className="flex gap-4">
										{/* Left: Author Avatar */}
										<div className="hidden shrink-0 sm:block">
											{threadAuthor.avatarUrl ? (
												<Image
													src={threadAuthor.avatarUrl}
													alt=""
													width={40}
													height={40}
													unoptimized
													className="h-10 w-10 rounded-full object-cover"
												/>
											) : (
												<div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--accent)/10 text-sm font-bold text-(--accent)">
													{threadAuthor.name.charAt(0).toUpperCase()}
												</div>
											)}
										</div>

										{/* Right: Content */}
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="font-semibold text-(--espresso) group-hover:text-(--accent) transition line-clamp-1">
													{thread.title}
												</h3>
												{thread.is_pinned ? (
													<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
														📌 {t("forum.pinned")}
													</span>
												) : null}
											</div>

											{/* Tags */}
											{Array.isArray(thread.tags) && thread.tags.length > 0 ? (
												<div className="mt-1.5 flex flex-wrap gap-1.5">
													{thread.tags.slice(0, 4).map((threadTag) => (
														<span
															key={`${thread.id}-${threadTag}`}
															className="rounded-full bg-(--sand)/25 px-2 py-0.5 text-[11px] font-medium text-(--muted)"
														>
															#{threadTag}
														</span>
													))}
													{thread.tags.length > 4 ? (
														<span className="text-[11px] text-(--muted)">+{thread.tags.length - 4}</span>
													) : null}
												</div>
											) : null}

											{/* Preview */}
											<p className="mt-1.5 text-sm text-(--muted) line-clamp-2">{clampPlainText(thread.content, 160)}</p>

											{/* Footer: Meta Info */}
											<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-(--muted)">
												<span className="font-medium text-(--espresso)">{threadAuthor.name}</span>
												<span className="inline-flex items-center gap-1">
													<MessageSquare size={12} />
													{commentCount} {t("forum.repliesCount")}
												</span>
												{reactionTotal > 0 ? (
													<span className="inline-flex items-center gap-1">
														{FORUM_REACTION_TYPES.filter((rt) => (reactionCounts[rt] ?? 0) > 0)
															.slice(0, 3)
															.map((rt) => (
																<span key={`${thread.id}-e-${rt}`}>{REACTION_EMOJI[rt]}</span>
															))}
														{reactionTotal}
													</span>
												) : null}
												<span>
													{t("forum.updated")} {formatDate(thread.updated_at, locale)}
												</span>
											</div>
										</div>
									</div>
								</div>
							</Link>
						);
					})}

					{filteredThreads.length === 0 ? (
						<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-(--surface-elevated) py-12 text-center">
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--sand)/20 text-2xl">💬</div>
							<p className="text-sm font-medium text-(--muted)">{t("forum.noThreads")}</p>
						</div>
					) : null}
				</div>
			</section>
		</div>
	);
}
