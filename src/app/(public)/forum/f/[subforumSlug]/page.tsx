import { MessageSquare, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForumBreadcrumbs } from "@/components/forum/forum-breadcrumbs";
import { ForumLiveAutoRefresh } from "@/components/forum/forum-live-auto-refresh";
import { ForumSearchControls } from "@/components/forum/forum-search-controls";
import { ThreadComposerModal } from "@/components/forum/thread-composer-modal";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { buildReactionCountMap } from "@/lib/forum";
import { getServerI18n } from "@/lib/i18n/server";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

interface SubforumPageProps {
	params: Promise<{ subforumSlug: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: { params: Promise<{ subforumSlug: string }> }): Promise<Metadata> {
	const { subforumSlug } = await params;
	return {
		title: `${subforumSlug.replaceAll("-", " ")} | Forum | Coffee Brew`,
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
	const threadIds = threadRows.map((thread) => thread.id);
	const authorIds = Array.from(new Set(threadRows.map((thread) => thread.author_id)));

	const [{ data: reactions }, { data: comments }, { data: authors }, { data: userBadges }, { data: allTagsSource }] =
		await Promise.all([
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
						data: [] as Array<{ user_id: string; badge_definitions: { label_en: string; label_id: string } | null }>,
					}),
			supabase.from("forum_threads").select("tags").eq("status", "visible").eq("subforum_id", subforum.id).limit(300),
		]);

	const authorById = new Map(
		(authors ?? []).map((authorRow) => [
			authorRow.id,
			{
				name: authorRow.display_name?.trim() || authorRow.email || "Unknown User",
				verified: Boolean(authorRow.is_verified),
				karma: Number(authorRow.karma_points ?? 0),
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
	const reactionRowsByThread = new Map<string, Array<{ reaction: ForumReactionType }>>();
	for (const reaction of reactions ?? []) {
		const current = reactionRowsByThread.get(reaction.target_id) ?? [];
		current.push({ reaction: reaction.reaction });
		reactionRowsByThread.set(reaction.target_id, current);
	}
	const commentCountByThread = new Map<string, number>();
	for (const comment of comments ?? []) {
		commentCountByThread.set(comment.thread_id, (commentCountByThread.get(comment.thread_id) ?? 0) + 1);
	}
	let totalRowsEffective = totalRows ?? threadRows.length;

	if (sort === "most_reacted") {
		threadRows = threadRows.sort((left, right) => {
			const reactionDiff =
				(reactionRowsByThread.get(right.id)?.length ?? 0) - (reactionRowsByThread.get(left.id)?.length ?? 0);
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
		threadRows = threadRows.filter((thread) => (reactionRowsByThread.get(thread.id)?.length ?? 0) >= minReactions);
	}
	if (needsComputedSort) {
		totalRowsEffective = threadRows.length;
		threadRows = threadRows.slice(fromIndex, toIndex + 1);
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

	const subforumLabel = locale === "id" ? subforum.name_id : subforum.name_en;
	const categoryLabel = category ? (locale === "id" ? category.name_id : category.name_en) : "Forum";

	return (
		<div className="space-y-6">
			<ForumLiveAutoRefresh
				tableFilters={[
					{ table: "forum_threads", filter: `subforum_id=eq.${subforum.id}` },
					{ table: "forum_comments" },
					{ table: "forum_reactions" },
				]}
			/>

			<header className="space-y-3">
				<ForumBreadcrumbs
					items={[
						{ href: "/", label: locale === "id" ? "Beranda" : "Home" },
						{ href: "/forum", label: locale === "id" ? "Forum" : "Forum" },
						{ href: `/forum`, label: categoryLabel },
						{ label: subforumLabel },
					]}
				/>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="font-heading text-4xl text-(--espresso)">{subforumLabel}</h1>
						<p className="text-sm text-(--muted)">
							{locale === "id"
								? (subforum.description_id ?? subforum.description_en ?? "")
								: (subforum.description_en ?? subforum.description_id ?? "")}
						</p>
					</div>
					{session ? (
						<ThreadComposerModal
							title={locale === "id" ? "Mulai Diskusi" : "Start Discussion"}
							description={locale === "id" ? "Mulai thread di sub-forum ini." : "Create a thread in this sub-forum."}
							triggerLabel={locale === "id" ? "Mulai Diskusi" : "Start Discussion"}
							initialSubforumId={subforum.id}
							subforums={[subforum]}
						/>
					) : (
						<Link
							href="/login"
							className="rounded-full border px-4 py-2 text-sm font-semibold text-(--accent) hover:bg-(--sand)/15"
						>
							{locale === "id" ? "Login untuk Post" : "Login to Post"}
						</Link>
					)}
				</div>
			</header>

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

			<section className="space-y-3">
				{threadRows.map((thread) => {
					const authorInfo = authorById.get(thread.author_id) ?? { name: "Unknown User", verified: false, karma: 0 };
					const reactionCounts = buildReactionCountMap(reactionRowsByThread.get(thread.id) ?? []);
					return (
						<Card key={thread.id} className="transition hover:-translate-y-1">
							<Link href={`/forum/${thread.id}`} className="block">
								<CardTitle>{thread.title}</CardTitle>
								{Array.isArray(thread.tags) && thread.tags.length > 0 ? (
									<div className="mt-2 flex flex-wrap gap-2">
										{thread.tags.slice(0, 6).map((threadTag) => (
											<span key={`${thread.id}-${threadTag}`} className="rounded-full border px-2 py-0.5 text-xs text-(--muted)">
												#{threadTag}
											</span>
										))}
									</div>
								) : null}
								<CardDescription className="mt-2 line-clamp-2">{clampPlainText(thread.content, 200)}</CardDescription>
							</Link>
							<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-(--muted)">
								<span className="inline-flex items-center gap-1">
									<UserRound size={13} />
									<Link href={`/users/${thread.author_id}`} className="font-semibold hover:text-(--espresso)">
										{authorInfo.name}
									</Link>
									{authorInfo.verified ? <span className="rounded-full border px-1 text-[10px]">✓</span> : null}
									{topBadgeByUserId.get(thread.author_id) ? (
										<span className="rounded-full border px-1.5 text-[10px]">{topBadgeByUserId.get(thread.author_id)}</span>
									) : null}
									<span>{locale === "id" ? `Karma ${authorInfo.karma}` : `Karma ${authorInfo.karma}`}</span>
								</span>
								<span className="inline-flex items-center gap-1">
									<MessageSquare size={13} />
									{commentCountByThread.get(thread.id) ?? 0}
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
				{threadRows.length === 0 ? (
					<Card>
						<p className="text-sm text-(--muted)">
							{locale === "id" ? "Tidak ada thread untuk filter saat ini." : "No threads matched the current filters."}
						</p>
					</Card>
				) : null}
			</section>

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
							className={`rounded-lg border px-3 py-1.5 text-sm ${value === page ? "bg-(--espresso) text-(--surface)" : "bg-(--surface)"}`}
						>
							{value}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
