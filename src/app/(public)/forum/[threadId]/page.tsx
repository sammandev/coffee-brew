import { notFound } from "next/navigation";
import { CommentComposer } from "@/components/forum/comment-composer";
import { CommentReplyToggle } from "@/components/forum/comment-reply-toggle";
import { ReactionBar } from "@/components/forum/reaction-bar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

interface ForumCommentRow {
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

export default async function ThreadDetailPage({ params }: { params: Promise<{ threadId: string }> }) {
	const [{ threadId }, { locale, t }] = await Promise.all([params, getServerI18n()]);
	const supabase = await createSupabaseServerClient();

	const [{ data: thread }, { data: comments }, { data: reactions }, session] = await Promise.all([
		supabase.from("forum_threads").select("*").eq("id", threadId).eq("status", "visible").maybeSingle(),
		supabase
			.from("forum_comments")
			.select("*")
			.eq("thread_id", threadId)
			.eq("status", "visible")
			.order("created_at", { ascending: true }),
		supabase.from("forum_reactions").select("target_type, target_id, reaction").eq("thread_id", threadId),
		getSessionContext(),
	]);

	if (!thread) {
		notFound();
	}

	const commentRows = (comments ?? []) as ForumCommentRow[];
	const commentsByParent = new Map<string | null, ForumCommentRow[]>();
	for (const comment of commentRows) {
		const key = comment.parent_comment_id ? String(comment.parent_comment_id) : null;
		const existing = commentsByParent.get(key) ?? [];
		existing.push(comment);
		commentsByParent.set(key, existing);
	}

	const threadReactions =
		reactions?.filter((reaction) => reaction.target_type === "thread" && reaction.target_id === thread.id) ?? [];
	const threadReactionCounts = buildReactionCounts(threadReactions as Array<{ reaction: string }>);
	const { data: authorProfile } = await supabase
		.from("profiles")
		.select("display_name, email")
		.eq("id", thread.author_id)
		.maybeSingle<{ display_name: string | null; email: string | null }>();
	const authorName = authorProfile?.display_name?.trim() || authorProfile?.email || "Unknown User";
	const hasUpdate = new Date(thread.updated_at).getTime() > new Date(thread.created_at).getTime();

	function renderComments(parentId: string | null, depth: number) {
		const rows = commentsByParent.get(parentId) ?? [];

		return rows.map((comment) => {
			const commentReactions =
				reactions?.filter((reaction) => reaction.target_type === "comment" && reaction.target_id === comment.id) ?? [];
			const commentReactionCounts = buildReactionCounts(commentReactions as Array<{ reaction: string }>);

			return (
				<div key={comment.id} className="space-y-3" style={{ marginLeft: `${depth * 1.25}rem` }}>
					<Card className="space-y-4">
						<RichTextContent html={comment.content} />
						<div className="flex items-center justify-between gap-3">
							<p className="text-xs text-[var(--muted)]">{formatDate(comment.created_at, locale)}</p>
						</div>
						<ReactionBar targetType="comment" targetId={comment.id} counts={commentReactionCounts} />
					</Card>

					{session && depth < 2 && (
						<CommentReplyToggle
							threadId={threadId}
							parentCommentId={comment.id}
							hideLabel={locale === "id" ? "Sembunyikan Balasan" : "Hide Reply"}
							placeholder={locale === "id" ? "Tulis balasan..." : "Write a reply..."}
							submitLabel={locale === "id" ? "Balas komentar" : "Reply to comment"}
						/>
					)}

					{renderComments(comment.id, depth + 1)}
				</div>
			);
		});
	}

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>Thread</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{thread.title}</h1>
				{Array.isArray(thread.tags) && thread.tags.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{thread.tags.map((tag: string) => (
							<span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-[var(--muted)]">
								#{tag}
							</span>
						))}
					</div>
				)}
				<p className="text-[var(--muted)]">
					{authorName} | {locale === "id" ? "Diposting" : "Posted"}: {formatDate(thread.created_at, locale)}
					{hasUpdate ? ` | ${locale === "id" ? "Diperbarui" : "Updated"}: ${formatDate(thread.updated_at, locale)}` : ""}
				</p>
			</header>

			<Card className="space-y-4">
				<RichTextContent html={thread.content} />
				<ReactionBar targetType="thread" targetId={thread.id} counts={threadReactionCounts} />
			</Card>

			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Balasan" : "Replies"}</h2>
				{renderComments(null, 0)}
			</section>

			{session ? (
				<CommentComposer threadId={threadId} />
			) : (
				<Card>
					<p className="text-sm text-[var(--muted)]">{t("forum.loginToReply")}</p>
				</Card>
			)}
		</div>
	);
}
