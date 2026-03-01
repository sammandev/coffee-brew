import type { Metadata } from "next";
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
import { Card } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { UserIdentitySummary } from "@/components/user/user-identity-summary";
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
	id: string;
	parent_comment_id: string | null;
	content: string;
	created_at: string;
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

	const [
		{ data: subforum },
		{ data: poll },
		{ data: reactions },
		{ data: rootComments, count: rootCount },
		{ data: allComments },
	] = await Promise.all([
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
		supabase
			.from("forum_comments")
			.select("id, thread_id, author_id, parent_comment_id, content, created_at", { count: "exact" })
			.eq("thread_id", thread.id)
			.eq("status", "visible")
			.is("parent_comment_id", null)
			.order("created_at", { ascending: true })
			.range(rootFrom, rootTo),
		supabase
			.from("forum_comments")
			.select("id, thread_id, author_id, parent_comment_id, content, created_at")
			.eq("thread_id", thread.id)
			.eq("status", "visible")
			.order("created_at", { ascending: true }),
	]);
	const { data: category } = subforum
		? await supabase
				.from("forum_categories")
				.select("id, slug, name_en, name_id")
				.eq("id", subforum.category_id)
				.maybeSingle()
		: { data: null };

	const rootRows = (rootComments ?? []) as Array<{
		id: string;
		thread_id: string;
		author_id: string;
		parent_comment_id: string | null;
		content: string;
		created_at: string;
	}>;
	const allCommentRows = (allComments ?? []) as ForumCommentRow[];
	const visibleRootIds = new Set(rootRows.map((root) => root.id));
	const includedCommentIds = new Set<string>();
	for (const rootId of visibleRootIds) {
		includedCommentIds.add(rootId);
	}
	let changed = true;
	while (changed) {
		changed = false;
		for (const row of allCommentRows) {
			if (row.parent_comment_id && includedCommentIds.has(row.parent_comment_id) && !includedCommentIds.has(row.id)) {
				includedCommentIds.add(row.id);
				changed = true;
			}
		}
	}
	const pagedComments = allCommentRows.filter((row) => includedCommentIds.has(row.id));

	const commentsByParent = new Map<string | null, ForumCommentRow[]>();
	for (const comment of pagedComments) {
		const key = comment.parent_comment_id ? String(comment.parent_comment_id) : null;
		const existing = commentsByParent.get(key) ?? [];
		existing.push(comment);
		commentsByParent.set(key, existing);
	}

	const threadReactions =
		reactions?.filter((reaction) => reaction.target_type === "thread" && reaction.target_id === thread.id) ?? [];
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

		return rows.map((comment) => {
			const commentReactions =
				reactions?.filter((reaction) => reaction.target_type === "comment" && reaction.target_id === comment.id) ?? [];
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

			return (
				<div key={comment.id} className="space-y-3" style={{ marginLeft: `${depth * 1.2}rem` }}>
					<Card className="space-y-4">
						<span id={`comment-${comment.id}`} className="block h-0 w-0 overflow-hidden" aria-hidden="true" />
						<div className="flex flex-wrap items-center justify-between gap-3">
							<UserIdentitySummary
								userId={comment.author_id}
								displayName={commentAuthor.name}
								avatarUrl={commentAuthor.avatarUrl}
								joinedAt={commentAuthor.joinedAt}
								karma={commentAuthor.karma}
								totalReviews={commentAuthor.totalReviews}
								locale={locale}
								variant="compact"
								hideJoined
								isVerified={commentAuthor.verified}
								mentionHandle={commentAuthor.mentionHandle}
								badges={commentAuthor.topBadge ? [commentAuthor.topBadge] : []}
							/>
							<ForumReportAction targetType={isReply ? "reply" : "comment"} targetId={comment.id} />
						</div>
						<RichTextContent html={comment.content} />
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-xs text-[var(--muted)]">{formatDate(comment.created_at, locale)}</p>
						</div>
						<ReactionBar targetType="comment" targetId={comment.id} counts={commentReactionCounts} />
					</Card>

					{session && depth < 2 && !thread.is_locked ? (
						<CommentReplyToggle
							threadId={threadId}
							parentCommentId={comment.id}
							currentUserId={session.userId}
							authorName={session.email}
							hideLabel={locale === "id" ? "Sembunyikan Balasan" : "Hide Reply"}
							placeholder={locale === "id" ? "Tulis balasan..." : "Write a reply..."}
							submitLabel={locale === "id" ? "Balas komentar" : "Reply to comment"}
						/>
					) : null}

					{renderComments(comment.id, depth + 1)}
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

			<header className="space-y-2">
				<ForumBreadcrumbs
					items={[
						{ href: "/", label: locale === "id" ? "Beranda" : "Home" },
						{ href: "/forum", label: locale === "id" ? "Forum" : "Forum" },
						{
							href: category ? `/forum` : undefined,
							label: category ? (locale === "id" ? category.name_id : category.name_en) : locale === "id" ? "Forum" : "Forum",
						},
						{
							href: subforum ? `/forum/f/${subforum.slug}` : undefined,
							label: subforum
								? locale === "id"
									? subforum.name_id
									: subforum.name_en
								: locale === "id"
									? "Thread"
									: "Thread",
						},
						{ label: thread.title },
					]}
				/>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="space-y-2">
						<Badge>Thread</Badge>
						<h1 className="font-heading text-4xl text-[var(--espresso)]">{thread.title}</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{thread.is_locked ? <Badge>{locale === "id" ? "Terkunci" : "Locked"}</Badge> : null}
						{thread.is_pinned ? <Badge>{locale === "id" ? "Dipin" : "Pinned"}</Badge> : null}
					</div>
				</div>
				{Array.isArray(thread.tags) && thread.tags.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{thread.tags.map((tag: string) => (
							<span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-[var(--muted)]">
								#{tag}
							</span>
						))}
					</div>
				) : null}
				<div className="flex flex-wrap items-center justify-between gap-3">
					<UserIdentitySummary
						userId={thread.author_id}
						displayName={authorInfo.name}
						avatarUrl={authorInfo.avatarUrl}
						joinedAt={authorInfo.joinedAt}
						karma={authorInfo.karma}
						totalReviews={authorInfo.totalReviews}
						locale={locale}
						variant="compact"
						hideJoined
						isVerified={authorInfo.verified}
						mentionHandle={authorInfo.mentionHandle}
						badges={authorInfo.topBadge ? [authorInfo.topBadge] : []}
					/>
					<ForumReportAction targetType="thread" targetId={thread.id} />
				</div>
				<p className="text-xs text-[var(--muted)]">
					{locale === "id" ? "Diposting" : "Posted"}: {formatDate(thread.created_at, locale)}
					{hasUpdate ? ` | ${locale === "id" ? "Diperbarui" : "Updated"}: ${formatDate(thread.updated_at, locale)}` : ""}
				</p>
			</header>

			<ForumThreadModerationControls
				threadId={thread.id}
				isModerator={Boolean(isModerator)}
				initialLocked={Boolean(thread.is_locked)}
				initialPinned={Boolean(thread.is_pinned)}
			/>

			<Card className="space-y-4">
				<RichTextContent html={thread.content} />
				<ReactionBar targetType="thread" targetId={thread.id} counts={threadReactionCounts} />
			</Card>

			{normalizedPoll && pollData ? (
				<ForumPollCard
					poll={normalizedPoll}
					initialMyVote={pollData.myVote}
					initialResults={pollData.results}
					totalVotes={pollData.totalVotes}
				/>
			) : null}

			<section className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Balasan" : "Replies"}</h2>
					<ThreadTypingIndicator threadId={threadId} locale={locale} currentUserId={session?.userId ?? null} />
				</div>
				{renderComments(null, 0)}
			</section>

			<div className="flex items-center justify-center gap-2">
				{Array.from({ length: totalPages }).map((_, index) => {
					const value = index + 1;
					const href = `/forum/${thread.id}?page=${value}`;
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

			{session ? (
				thread.is_locked && !isModerator ? (
					<Card>
						<p className="text-sm text-(--muted)">
							{locale === "id" ? "Thread ini terkunci oleh moderator." : "This thread is locked by moderators."}
						</p>
					</Card>
				) : (
					<CommentComposer threadId={threadId} currentUserId={session.userId} />
				)
			) : (
				<Card>
					<p className="text-sm text-[var(--muted)]">{t("forum.loginToReply")}</p>
				</Card>
			)}
		</div>
	);
}
