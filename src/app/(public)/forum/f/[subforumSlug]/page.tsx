import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
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

interface SubforumPageProps {
	params: Promise<{ subforumSlug: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: { params: Promise<{ subforumSlug: string }> }): Promise<Metadata> {
	const { subforumSlug } = await params;
	const readableSubforum = subforumSlug
		.split("-")
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
	return {
		title: `${readableSubforum} | Forum`,
		description: "Browse and search threads in this forum sub-forum.",
	};
}

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
	created_at: string;
	updated_at: string;
	is_pinned: boolean;
}

export default async function SubforumPage({ params, searchParams }: SubforumPageProps) {
	const [{ subforumSlug }, query, { locale }, session] = await Promise.all([
		params,
		searchParams,
		getServerI18n(),
		getSessionContext(),
	]);
	const supabase = createSupabaseAdminClient();
	const { data: subforum } = await supabase
		.from("forum_subforums")
		.select("id, slug, name_en, name_id, description_en, description_id, category_id")
		.eq("slug", subforumSlug)
		.eq("is_visible", true)
		.maybeSingle();
	if (!subforum) {
		redirect("/forum");
	}

	const { data: category } = await supabase
		.from("forum_categories")
		.select("id, slug, name_en, name_id")
		.eq("id", subforum.category_id)
		.maybeSingle();

	const q = firstParam(query.q).trim();
	const tag = firstParam(query.tag).trim().toLowerCase();
	const author = firstParam(query.author).trim().toLowerCase();
	const from = firstParam(query.from).trim();
	const to = firstParam(query.to).trim();
	const sort = firstParam(query.sort).trim() || "latest";
	const minReactionsRaw = firstParam(query.minReactions).trim();
	const minReactions = Number.isFinite(Number(minReactionsRaw)) ? Math.max(0, Number(minReactionsRaw)) : 0;
	const page = Math.max(1, Number(firstParam(query.page) || "1") || 1);
	const perPage = 12;
	const fromIndex = (page - 1) * perPage;
	const toIndex = fromIndex + perPage - 1;
	const needsComputedSort = sort === "most_reacted" || sort === "most_discussed" || minReactions > 0;
	let authorFilterIds: string[] | null = null;

	if (author) {
		const { data: matchedAuthors } = await supabase
			.from("profiles")
			.select("id")
			.or(`display_name.ilike.%${author}%,mention_handle.ilike.%${author}%,email.ilike.%${author}%`)
			.limit(120);
		authorFilterIds = (matchedAuthors ?? []).map((row) => row.id);
		if (authorFilterIds.length === 0) {
			authorFilterIds = ["00000000-0000-0000-0000-000000000000"];
		}
	}

	let threadQuery = supabase
		.from("forum_threads")
		.select("id, title, content, tags, author_id, created_at, updated_at, is_pinned", { count: "exact" })
		.eq("status", "visible")
		.is("deleted_at", null)
		.eq("subforum_id", subforum.id);

	if (q) {
		threadQuery = threadQuery.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
	}
	if (tag) {
		threadQuery = threadQuery.contains("tags", [tag]);
	}
	if (authorFilterIds) {
		threadQuery = threadQuery.in("author_id", authorFilterIds);
	}
	if (from) {
		threadQuery = threadQuery.gte("created_at", from);
	}
	if (to) {
		threadQuery = threadQuery.lte("created_at", to);
	}
	if (sort === "oldest") {
		threadQuery = threadQuery.order("created_at", { ascending: true });
	} else if (sort === "most_reacted" || sort === "most_discussed") {
		threadQuery = threadQuery.order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
	} else {
		threadQuery = threadQuery.order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
	}
	if (!needsComputedSort) {
		threadQuery = threadQuery.range(fromIndex, toIndex);
	}

	const { data: baseThreads, count: totalRows } = await threadQuery;
	let threadRows = (baseThreads ?? []) as ThreadRow[];
	const allThreadIds = threadRows.map((thread) => thread.id);

	const [{ data: commentTotals }, { data: reactionTotals }, { data: allTagsSource }] = await Promise.all([
		allThreadIds.length > 0
			? supabase.rpc("get_forum_thread_comment_totals", { thread_ids: allThreadIds })
			: Promise.resolve({ data: [] as Array<{ thread_id: string; comment_total: number }> }),
		allThreadIds.length > 0
			? supabase.rpc("get_forum_thread_reaction_totals", { thread_ids: allThreadIds })
			: Promise.resolve({ data: [] as Array<{ thread_id: string; reaction_total: number }> }),
		supabase.from("forum_threads").select("tags").eq("status", "visible").eq("subforum_id", subforum.id).limit(300),
	]);

	const commentCountByThread = new Map<string, number>();
	for (const row of (commentTotals ?? []) as Array<{ thread_id: string; comment_total: number }>) {
		commentCountByThread.set(row.thread_id, Number(row.comment_total ?? 0));
	}
	const reactionCountByThread = new Map<string, number>();
	for (const row of (reactionTotals ?? []) as Array<{ thread_id: string; reaction_total: number }>) {
		reactionCountByThread.set(row.thread_id, Number(row.reaction_total ?? 0));
	}

	let totalRowsEffective = totalRows ?? threadRows.length;

	if (sort === "most_reacted") {
		threadRows = threadRows.sort((left, right) => {
			const reactionDiff = (reactionCountByThread.get(right.id) ?? 0) - (reactionCountByThread.get(left.id) ?? 0);
			if (reactionDiff !== 0) return reactionDiff;
			if (left.is_pinned !== right.is_pinned) return right.is_pinned ? 1 : -1;
			return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
		});
	} else if (sort === "most_discussed") {
		threadRows = threadRows.sort((left, right) => {
			const commentDiff = (commentCountByThread.get(right.id) ?? 0) - (commentCountByThread.get(left.id) ?? 0);
			if (commentDiff !== 0) return commentDiff;
			if (left.is_pinned !== right.is_pinned) return right.is_pinned ? 1 : -1;
			return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
		});
	}
	if (minReactions > 0) {
		threadRows = threadRows.filter((thread) => (reactionCountByThread.get(thread.id) ?? 0) >= minReactions);
	}
	if (needsComputedSort) {
		totalRowsEffective = threadRows.length;
		threadRows = threadRows.slice(fromIndex, toIndex + 1);
	}

	const visibleThreadIds = threadRows.map((thread) => thread.id);
	const authorIds = Array.from(new Set(threadRows.map((thread) => thread.author_id)));
	const [{ data: reactions }, { data: authors }] = await Promise.all([
		visibleThreadIds.length > 0
			? supabase
					.from("forum_reactions")
					.select("target_id, reaction")
					.eq("target_type", "thread")
					.in("target_id", visibleThreadIds)
			: Promise.resolve({ data: [] as Array<{ target_id: string; reaction: ForumReactionType }> }),
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
		(authors ?? []).map((authorRow) => [
			authorRow.id,
			{
				avatarUrl: authorRow.avatar_url,
				name: resolveUserDisplayName(authorRow),
			},
		]),
	);
	const reactionRowsByThread = new Map<string, Array<{ reaction: ForumReactionType }>>();
	for (const reaction of reactions ?? []) {
		const current = reactionRowsByThread.get(reaction.target_id) ?? [];
		current.push({ reaction: reaction.reaction });
		reactionRowsByThread.set(reaction.target_id, current);
	}

	const tagCounts = new Map<string, number>();
	for (const row of allTagsSource?.flatMap((item) => item.tags) ?? []) {
		const normalized = String(row ?? "")
			.trim()
			.toLowerCase();
		if (!normalized) continue;
		tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
	}
	const popularTags = Array.from(tagCounts.entries())
		.sort((left, right) => right[1] - left[1])
		.slice(0, 12)
		.map(([value]) => value);

	const totalPages = Math.max(1, Math.ceil(totalRowsEffective / perPage));

	function buildQuery(next: Record<string, string>) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(next)) {
			if (!value.trim()) continue;
			params.set(key, value.trim());
		}
		const serialized = params.toString();
		return serialized.length > 0 ? `?${serialized}` : "";
	}

	const { t } = await getServerI18n();
	const subforumLabel = locale === "id" ? subforum.name_id : subforum.name_en;
	const categoryLabel = category ? (locale === "id" ? category.name_id : category.name_en) : "Forum";
	const subforumDescription =
		locale === "id"
			? (subforum.description_id ?? subforum.description_en ?? "")
			: (subforum.description_en ?? subforum.description_id ?? "");

	const totalReactionsForThread = (id: string) => {
		const counts = buildReactionCountMap(reactionRowsByThread.get(id) ?? []);
		return FORUM_REACTION_TYPES.reduce((sum, rt) => sum + (counts[rt] ?? 0), 0);
	};

	return (
		<div className="space-y-6">
			<ForumLiveAutoRefresh
				tableFilters={[
					{ table: "forum_threads", filter: `subforum_id=eq.${subforum.id}` },
					{ table: "forum_comments" },
					{ table: "forum_reactions" },
				]}
			/>

			{/* Header */}
			<header className="space-y-4">
				<ForumBreadcrumbs
					items={[
						{ href: "/", label: t("nav.home") },
						{ href: "/forum", label: t("nav.forum") },
						{ href: "/forum", label: categoryLabel },
						{ label: subforumLabel },
					]}
				/>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<Badge>{t("nav.forum")}</Badge>
						<h1 className="font-heading text-4xl text-(--espresso)">{subforumLabel}</h1>
						{subforumDescription ? <p className="max-w-2xl text-(--muted)">{subforumDescription}</p> : null}
						<div className="flex items-center gap-1.5 pt-1 text-sm text-(--muted)">
							<MessageSquare size={14} />
							<span className="font-semibold text-(--espresso)">{totalRowsEffective}</span> {t("forum.discussions")}
						</div>
					</div>
					{session ? (
						<ThreadComposerModal
							title={t("forum.startDiscussion")}
							description={t("forum.startDiscussionDesc")}
							triggerLabel={t("forum.startDiscussion")}
							initialSubforumId={subforum.id}
							subforums={[subforum]}
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

			{/* Search */}
			<ForumSearchControls
				basePath={`/forum/f/${subforum.slug}`}
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

			{/* Threads */}
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-heading text-xl text-(--espresso) sm:text-2xl">{t("forum.recentActivity")}</h2>
					</div>
					{threadRows.length > 0 ? (
						<span className="rounded-full bg-(--accent)/10 px-3 py-1 text-xs font-semibold text-(--accent)">
							{totalRowsEffective} {t("forum.resultsCount")}
						</span>
					) : null}
				</div>

				<div className="space-y-3">
					{threadRows.map((thread) => {
						const reactionCounts = buildReactionCountMap(reactionRowsByThread.get(thread.id) ?? []);
						const threadAuthor = authorById.get(thread.author_id) ?? {
							avatarUrl: null,
							name: "Unknown User",
						};
						const commentCount = commentCountByThread.get(thread.id) ?? 0;
						const reactionTotal = totalReactionsForThread(thread.id);
						return (
							<Link key={thread.id} href={`/forum/${thread.id}`} className="group block">
								<div className="rounded-2xl border bg-(--surface-elevated) p-4 transition group-hover:shadow-md group-hover:border-(--accent)/30 sm:p-5">
									<div className="flex gap-4">
										{/* Avatar */}
										<div className="hidden shrink-0 sm:block">
											{threadAuthor.avatarUrl ? (
												<Image
													src={threadAuthor.avatarUrl}
													alt=""
													width={40}
													height={40}
													sizes="40px"
													className="h-10 w-10 rounded-full object-cover"
												/>
											) : (
												<div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--accent)/10 text-sm font-bold text-(--accent)">
													{threadAuthor.name.charAt(0).toUpperCase()}
												</div>
											)}
										</div>

										{/* Content */}
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="font-semibold text-(--espresso) transition group-hover:text-(--accent) line-clamp-1">
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

											{/* Footer */}
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

					{threadRows.length === 0 ? (
						<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-(--surface-elevated) py-12 text-center">
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--sand)/20 text-2xl">💬</div>
							<p className="text-sm font-medium text-(--muted)">{t("forum.noThreads")}</p>
						</div>
					) : null}
				</div>
			</section>

			{/* Pagination */}
			{totalPages > 1 ? (
				<div className="flex items-center justify-center gap-2">
					{Array.from({ length: totalPages }).map((_, index) => {
						const value = index + 1;
						const href = `/forum/f/${subforum.slug}${buildQuery({
							q,
							tag,
							author,
							minReactions: minReactionsRaw,
							from,
							to,
							sort,
							page: String(value),
						})}`;
						return (
							<Link
								key={value}
								href={href}
								className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${value === page ? "bg-(--espresso) text-(--surface)" : "bg-(--surface-elevated) text-(--muted) hover:bg-(--sand)/20"}`}
							>
								{value}
							</Link>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
