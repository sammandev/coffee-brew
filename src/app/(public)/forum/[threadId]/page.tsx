import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentComposer } from "@/components/forum/comment-composer";
import { CommentReplyToggle } from "@/components/forum/comment-reply-toggle";
import { ForumBreadcrumbs } from "@/components/forum/forum-breadcrumbs";
import { ForumLiveAutoRefresh } from "@/components/forum/forum-live-auto-refresh";
import { ForumPollCard } from "@/components/forum/forum-poll-card";
import { ForumReportAction } from "@/components/forum/forum-report-action";
import { ForumThreadModerationControls } from "@/components/forum/forum-thread-moderation-controls";
import { ReactionBar } from "@/components/forum/reaction-bar";
import { ThreadTypingIndicator } from "@/components/forum/thread-typing-indicator";
import { Badge } from "@/components/ui/badge";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ForumPollRecord } from "@/lib/types";
import { buildHighestBadgeMap, resolveUserDisplayName } from "@/lib/user-identity";
import { formatDate } from "@/lib/utils";

interface ForumCommentRow {
	author_id: string;
	content: string;
	created_at: string;
	id: string;
	parent_comment_id: string | null;
	thread_id: string;
}

type ReactionCountMap = Partial<Record<ForumReactionType, number>>;

function buildReactionCounts(rows: Array<{ reaction: string }>) {
	const counts: ReactionCountMap = {};
	for (const reactionType of FORUM_REACTION_TYPES) {
		counts[reactionType] = 0;
	}
	for (const row of rows) {
		if (FORUM_REACTION_TYPES.includes(row.reaction as ForumReactionType)) {
			const key = row.reaction as ForumReactionType;
			counts[key] = (counts[key] ?? 0) + 1;
		}
	}
	return counts;
}

interface ThreadDetailPageProps {
	params: Promise<{ threadId: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: { params: Promise<{ threadId: string }> }): Promise<Metadata> {
	const { threadId } = await params;
	const supabase = createSupabaseAdminClient();
	const { data: thread } = await supabase.from("forum_threads").select("title").eq("id", threadId).maybeSingle();
	if (!thread) {
		return {
			title: "Thread Not Found | Forum",
		};
	}
	return {
		title: `${thread.title} | Forum`,
		description: `Join the discussion: ${thread.title}`,
	};
}

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function loadThreadCommentTreePage(
	supabase: SupabaseServerClient,
	threadId: string,
	rootFrom: number,
	rootTo: number,
) {
	const { data: rootRowsRaw, count: rootCount } = await supabase
		.from("forum_comments")
		.select("id, thread_id, author_id, parent_comment_id, content, created_at", { count: "exact" })
		.eq("thread_id", threadId)
		.eq("status", "visible")
		.is("parent_comment_id", null)
		.order("created_at", { ascending: true })
		.range(rootFrom, rootTo);

	const rootRows = (rootRowsRaw ?? []) as ForumCommentRow[];
	if (rootRows.length === 0) {
		return {
			pagedComments: [] as ForumCommentRow[],
			rootCount: rootCount ?? 0,
		};
	}

	const collectedRows = [...rootRows];
	const seenCommentIds = new Set(rootRows.map((row) => row.id));
	let frontier = rootRows.map((row) => row.id);

	while (frontier.length > 0) {
		const { data: childRowsRaw } = await supabase
			.from("forum_comments")
			.select("id, thread_id, author_id, parent_comment_id, content, created_at")
			.eq("thread_id", threadId)
			.eq("status", "visible")
			.in("parent_comment_id", frontier)
			.order("created_at", { ascending: true });

		const childRows = (childRowsRaw ?? []) as ForumCommentRow[];
		if (childRows.length === 0) {
			break;
		}

		const nextFrontier: string[] = [];
		for (const childRow of childRows) {
			if (seenCommentIds.has(childRow.id)) continue;
			seenCommentIds.add(childRow.id);
			collectedRows.push(childRow);
			nextFrontier.push(childRow.id);
		}

		frontier = nextFrontier;
	}

	return {
		pagedComments: collectedRows,
		rootCount: rootCount ?? 0,
	};
}

export default async function ThreadDetailPage({ params, searchParams }: ThreadDetailPageProps) {
	const [{ threadId }, query, { locale, t }] = await Promise.all([params, searchParams, getServerI18n()]);
	const page = Math.max(1, Number(firstParam(query.page) || "1") || 1);
	const perPage = 20;
	const rootFrom = (page - 1) * perPage;
	const rootTo = rootFrom + perPage - 1;

	const supabase = await createSupabaseServerClient();
	const [threadResult, session] = await Promise.all([
		supabase
			.from("forum_threads")
			.select("*")
			.eq("id", threadId)
			.eq("status", "visible")
			.is("deleted_at", null)
			.maybeSingle(),
		getSessionContext(),
	]);
	const thread = threadResult.data;
	if (!thread) {
		notFound();
	}

	const [{ data: subforum }, { data: poll }, { data: reactions }, commentTree] = await Promise.all([
		supabase
			.from("forum_subforums")
			.select("id, slug, name_en, name_id, category_id")
			.eq("id", thread.subforum_id)
			.maybeSingle(),
		supabase
			.from("forum_polls")
			.select("id, thread_id, question, options, closes_at, created_by, created_at, updated_at")
			.eq("thread_id", thread.id)
			.maybeSingle(),
		supabase.from("forum_reactions").select("target_type, target_id, reaction").eq("thread_id", thread.id),
		loadThreadCommentTreePage(supabase, thread.id, rootFrom, rootTo),
	]);
	const { data: category } = subforum
		? await supabase
				.from("forum_categories")
				.select("id, slug, name_en, name_id")
				.eq("id", subforum.category_id)
				.maybeSingle()
		: { data: null };

	const rootCount = commentTree.rootCount;
	const pagedComments = commentTree.pagedComments;

	const commentsByParent = new Map<string | null, ForumCommentRow[]>();
	for (const comment of pagedComments) {
		const key = comment.parent_comment_id ? String(comment.parent_comment_id) : null;
		const existing = commentsByParent.get(key) ?? [];
		existing.push(comment);
		commentsByParent.set(key, existing);
	}

	const reactionsByTarget = new Map<string, Array<{ reaction: string }>>();
	for (const reactionRow of reactions ?? []) {
		const current = reactionsByTarget.get(reactionRow.target_id) ?? [];
		current.push({ reaction: reactionRow.reaction });
		reactionsByTarget.set(reactionRow.target_id, current);
	}
	const threadReactions = reactionsByTarget.get(thread.id) ?? [];
	const threadReactionCounts = buildReactionCounts(threadReactions as Array<{ reaction: string }>);
	const profileIds = Array.from(new Set([thread.author_id, ...pagedComments.map((commentRow) => commentRow.author_id)]));
	const supabaseAdmin = createSupabaseAdminClient();
	const [{ data: profileRows }, { data: userBadges }, { data: reviewerRows }] = await Promise.all([
		profileIds.length > 0
			? supabaseAdmin
					.from("profiles")
					.select("id, display_name, email, avatar_url, created_at, is_verified, karma_points, mention_handle")
					.in("id", profileIds)
			: Promise.resolve({
					data: [] as Array<{
						id: string;
						display_name: string | null;
						email: string | null;
						avatar_url: string | null;
						created_at: string;
						is_verified: boolean;
						karma_points: number;
						mention_handle: string | null;
					}>,
				}),
		profileIds.length > 0
			? supabaseAdmin
					.from("user_badges")
					.select("user_id, badge_id, badge_definitions(label_en, label_id, min_points)")
					.in("user_id", profileIds)
			: Promise.resolve({
					data: [] as Array<{
						user_id: string;
						badge_definitions: { label_en: string; label_id: string; min_points: number } | null;
					}>,
				}),
		profileIds.length > 0
			? supabaseAdmin.from("brew_reviews").select("reviewer_id").in("reviewer_id", profileIds).limit(5000)
			: Promise.resolve({ data: [] as Array<{ reviewer_id: string }> }),
	]);

	const reviewerCountByUserId = new Map<string, number>();
	for (const row of reviewerRows ?? []) {
		reviewerCountByUserId.set(row.reviewer_id, (reviewerCountByUserId.get(row.reviewer_id) ?? 0) + 1);
	}
	const topBadgeByUserId = buildHighestBadgeMap(userBadges ?? [], locale);
	const profileById = new Map(
		(profileRows ?? []).map((profileRow) => [
			profileRow.id,
			{
				avatarUrl: profileRow.avatar_url,
				joinedAt: profileRow.created_at,
				mentionHandle: profileRow.mention_handle,
				name: resolveUserDisplayName(profileRow),
				topBadge: topBadgeByUserId.get(profileRow.id) ?? null,
				totalReviews: reviewerCountByUserId.get(profileRow.id) ?? 0,
				verified: Boolean(profileRow.is_verified),
				karma: Number(profileRow.karma_points ?? 0),
			},
		]),
	);
	const authorInfo = profileById.get(thread.author_id) ?? {
		avatarUrl: null,
		joinedAt: thread.created_at,
		mentionHandle: null,
		name: "Unknown User",
		topBadge: null,
		totalReviews: 0,
		verified: false,
		karma: 0,
	};
	const hasUpdate = new Date(thread.updated_at).getTime() > new Date(thread.created_at).getTime();
	const isModerator = session?.role === "admin" || session?.role === "superuser";
	const normalizedPoll: ForumPollRecord | null = poll
		? {
				id: String(poll.id),
				thread_id: String(poll.thread_id),
				question: String(poll.question),
				options: Array.isArray(poll.options) ? poll.options.map((option) => String(option)) : [],
				closes_at: poll.closes_at ? String(poll.closes_at) : null,
				created_by: String(poll.created_by),
				created_at: String(poll.created_at),
				updated_at: String(poll.updated_at),
			}
		: null;

	async function loadPollData() {
		if (!poll) return null;
		const [{ data: voteRows }, myVoteResult] = await Promise.all([
			supabase.from("forum_poll_votes").select("option_index").eq("poll_id", poll.id),
			session
				? supabase
						.from("forum_poll_votes")
						.select("option_index")
						.eq("poll_id", poll.id)
						.eq("user_id", session.userId)
						.maybeSingle()
				: Promise.resolve({ data: null }),
		]);
		const options = Array.isArray(poll.options) ? (poll.options as string[]) : [];
		const counts = options.map((_, index) => (voteRows ?? []).filter((vote) => vote.option_index === index).length);
		const totalVotes = counts.reduce((sum, count) => sum + count, 0);
		return {
			myVote: myVoteResult.data?.option_index ?? null,
			totalVotes,
			results: counts.map((count, index) => ({
				option: options[index] ?? "",
				count,
				percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0,
			})),
		};
	}

	const pollData = await loadPollData();
	const totalPages = Math.max(1, Math.ceil((rootCount ?? 0) / perPage));

	function renderComments(parentId: string | null, depth: number) {
		const rows = commentsByParent.get(parentId) ?? [];

		return rows.map((comment, index) => {
			const commentReactions = reactionsByTarget.get(comment.id) ?? [];
			const commentReactionCounts = buildReactionCounts(commentReactions as Array<{ reaction: string }>);
			const commentAuthor = profileById.get(comment.author_id) ?? {
				avatarUrl: null,
				joinedAt: comment.created_at,
				mentionHandle: null,
				name: "Unknown User",
				topBadge: null,
				totalReviews: 0,
				verified: false,
				karma: 0,
			};
			const isReply = Boolean(comment.parent_comment_id);
			const children = commentsByParent.get(comment.id) ?? [];
			const isLastChild = index === rows.length - 1;

			return (
				<div key={comment.id} className="relative">
					{/* Vertical thread line from parent */}
					{depth > 0 && !isLastChild ? (
						<div className="absolute left-4 top-0 bottom-0 w-px bg-(--border)" aria-hidden="true" />
					) : null}
					{/* Shorter line for last child - stops at the horizontal connector */}
					{depth > 0 && isLastChild ? (
						<div className="absolute left-4 top-0 h-5 w-px bg-(--border)" aria-hidden="true" />
					) : null}
					{/* Horizontal connector from thread line to comment card */}
					{depth > 0 ? <div className="absolute left-4 top-5 h-px w-4 bg-(--border)" aria-hidden="true" /> : null}

					<div className={depth > 0 ? "pl-9" : ""}>
						<span id={`comment-${comment.id}`} className="block h-0 w-0 overflow-hidden" aria-hidden="true" />

						{/* Comment Card */}
						<div className="rounded-xl border bg-(--surface-elevated) p-4">
							{/* Comment Header */}
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center gap-2.5">
									{commentAuthor.avatarUrl ? (
										<Image
											src={commentAuthor.avatarUrl}
											alt=""
											width={28}
											height={28}
											unoptimized
											className="h-7 w-7 rounded-full object-cover"
										/>
									) : (
										<div className="flex h-7 w-7 items-center justify-center rounded-full bg-(--accent)/10 text-xs font-bold text-(--accent)">
											{commentAuthor.name.charAt(0).toUpperCase()}
										</div>
									)}
									<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span className="text-sm font-semibold text-(--espresso)">{commentAuthor.name}</span>
										{commentAuthor.verified ? (
											<span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
												✓
											</span>
										) : null}
										{commentAuthor.topBadge ? (
											<span className="rounded-full bg-(--accent)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--accent)">
												{commentAuthor.topBadge}
											</span>
										) : null}
										<span className="text-[11px] text-(--muted)">{formatDate(comment.created_at, locale)}</span>
									</div>
								</div>
								<ForumReportAction targetType={isReply ? "reply" : "comment"} targetId={comment.id} />
							</div>

							{/* Comment Body */}
							<div className="mt-2">
								<RichTextContent html={comment.content} />
							</div>

							{/* Comment Footer */}
							<div className="mt-2">
								<ReactionBar targetType="comment" targetId={comment.id} counts={commentReactionCounts} />
							</div>

							{/* Reply toggle inline */}
							{session && depth < 3 && !thread.is_locked ? (
								<div className="mt-2 border-t border-(--border) pt-2">
									<CommentReplyToggle
										threadId={threadId}
										parentCommentId={comment.id}
										currentUserId={session.userId}
										authorName={session.email}
										hideLabel={t("forum.hideReply")}
										placeholder={t("forum.writeReply")}
										submitLabel={t("forum.replyToComment")}
									/>
								</div>
							) : null}
						</div>
					</div>

					{/* Nested replies */}
					{children.length > 0 ? (
						<div className={`relative mt-2 ${depth > 0 ? "ml-4" : "ml-4"}`}>
							<div className="space-y-2">{renderComments(comment.id, depth + 1)}</div>
						</div>
					) : null}
				</div>
			);
		});
	}

	return (
		<div className="space-y-6">
			<ForumLiveAutoRefresh
				tableFilters={[
					{ table: "forum_threads", filter: `id=eq.${thread.id}` },
					{ table: "forum_comments", filter: `thread_id=eq.${thread.id}` },
					{ table: "forum_reactions", filter: `thread_id=eq.${thread.id}` },
				]}
			/>

			{/* Header */}
			<header className="space-y-4">
				<ForumBreadcrumbs
					items={[
						{ href: "/", label: t("nav.home") },
						{ href: "/forum", label: t("nav.forum") },
						{
							href: category ? "/forum" : undefined,
							label: category ? (locale === "id" ? category.name_id : category.name_en) : t("nav.forum"),
						},
						{
							href: subforum ? `/forum/f/${subforum.slug}` : undefined,
							label: subforum ? (locale === "id" ? subforum.name_id : subforum.name_en) : "Thread",
						},
						{ label: thread.title },
					]}
				/>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<Badge>{t("nav.forum")}</Badge>
						<h1 className="font-heading text-3xl text-(--espresso) sm:text-4xl">{thread.title}</h1>
						{/* Tags */}
						{Array.isArray(thread.tags) && thread.tags.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{thread.tags.map((tag: string) => (
									<span key={tag} className="rounded-full bg-(--sand)/25 px-2.5 py-0.5 text-xs font-medium text-(--muted)">
										#{tag}
									</span>
								))}
							</div>
						) : null}
					</div>
					<div className="flex items-center gap-2">
						{thread.is_locked ? (
							<span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
								🔒 {t("forum.locked")}
							</span>
						) : null}
						{thread.is_pinned ? (
							<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
								📌 {t("forum.pinned")}
							</span>
						) : null}
					</div>
				</div>
			</header>

			{/* Moderation Controls */}
			<ForumThreadModerationControls
				threadId={thread.id}
				isModerator={Boolean(isModerator)}
				initialLocked={Boolean(thread.is_locked)}
				initialPinned={Boolean(thread.is_pinned)}
			/>

			{/* Thread Content (OP Post) */}
			<div className="rounded-xl border bg-(--surface-elevated) p-5 sm:p-6">
				{/* Author Info */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						{authorInfo.avatarUrl ? (
							<Image
								src={authorInfo.avatarUrl}
								alt=""
								width={36}
								height={36}
								unoptimized
								className="h-9 w-9 rounded-full object-cover"
							/>
						) : (
							<div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--accent)/10 text-sm font-bold text-(--accent)">
								{authorInfo.name.charAt(0).toUpperCase()}
							</div>
						)}
						<div>
							<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<span className="text-sm font-semibold text-(--espresso)">{authorInfo.name}</span>
								{authorInfo.verified ? (
									<span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
										✓
									</span>
								) : null}
								{authorInfo.topBadge ? (
									<span className="rounded-full bg-(--accent)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--accent)">
										{authorInfo.topBadge}
									</span>
								) : null}
							</div>
							<p className="text-xs text-(--muted)">
								{t("forum.posted")} {formatDate(thread.created_at, locale)}
								{hasUpdate ? ` · ${t("forum.updated")} ${formatDate(thread.updated_at, locale)}` : ""}
							</p>
						</div>
					</div>
					<ForumReportAction targetType="thread" targetId={thread.id} />
				</div>

				{/* Content */}
				<div className="mt-4">
					<RichTextContent html={thread.content} />
				</div>

				{/* Reactions */}
				<div className="mt-4 border-t border-(--border) pt-3">
					<ReactionBar targetType="thread" targetId={thread.id} counts={threadReactionCounts} />
				</div>
			</div>

			{/* Poll */}
			{normalizedPoll && pollData ? (
				<ForumPollCard
					poll={normalizedPoll}
					initialMyVote={pollData.myVote}
					initialResults={pollData.results}
					totalVotes={pollData.totalVotes}
				/>
			) : null}

			{/* Replies Section */}
			<section className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<h2 className="font-heading text-xl text-(--espresso) sm:text-2xl">{locale === "id" ? "Balasan" : "Replies"}</h2>
						<span className="rounded-full bg-(--accent)/10 px-2.5 py-0.5 text-xs font-semibold text-(--accent)">
							{rootCount ?? 0}
						</span>
					</div>
					<ThreadTypingIndicator threadId={threadId} locale={locale} currentUserId={session?.userId ?? null} />
				</div>

				{/* Comment List */}
				<div className="space-y-3">{renderComments(null, 0)}</div>

				{/* Empty Comments */}
				{(rootCount ?? 0) === 0 ? (
					<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-(--surface-elevated) py-10 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--sand)/20 text-xl">
							<MessageSquare size={20} className="text-(--muted)" />
						</div>
						<p className="text-sm text-(--muted)">
							{locale === "id" ? "Belum ada balasan. Jadilah yang pertama!" : "No replies yet. Be the first!"}
						</p>
					</div>
				) : null}
			</section>

			{/* Pagination */}
			{totalPages > 1 ? (
				<div className="flex items-center justify-center gap-2">
					{Array.from({ length: totalPages }).map((_, index) => {
						const value = index + 1;
						const href = `/forum/${thread.id}?page=${value}`;
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

			{/* Comment Composer */}
			{session ? (
				thread.is_locked && !isModerator ? (
					<div className="rounded-2xl border border-dashed bg-(--surface-elevated) p-5 text-center">
						<p className="text-sm text-(--muted)">
							{locale === "id" ? "Thread ini terkunci oleh moderator." : "This thread is locked by moderators."}
						</p>
					</div>
				) : (
					<CommentComposer threadId={threadId} currentUserId={session.userId} />
				)
			) : (
				<div className="rounded-2xl border bg-(--surface-elevated) p-5 text-center">
					<p className="text-sm text-(--muted)">{t("forum.loginToReply")}</p>
				</div>
			)}
		</div>
	);
}
