import { notFound } from "next/navigation";
import { CommentComposer } from "@/components/forum/comment-composer";
import { ReactionBar } from "@/components/forum/reaction-bar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

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

	const threadReactions =
		reactions?.filter((reaction) => reaction.target_type === "thread" && reaction.target_id === thread.id) ?? [];

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>Thread</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{thread.title}</h1>
				<p className="text-[var(--muted)]">
					{locale === "id" ? "Diposting pada" : "Posted on"} {formatDate(thread.created_at, locale)}
				</p>
			</header>

			<Card className="space-y-4">
				<p className="whitespace-pre-wrap text-[var(--foreground)]/90">{thread.content}</p>
				<ReactionBar targetType="thread" targetId={thread.id} />
				<p className="text-xs text-[var(--muted)]">
					{threadReactions.length} {locale === "id" ? "reaksi" : "reactions"}
				</p>
			</Card>

			<section className="space-y-4">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Balasan" : "Replies"}</h2>
				{comments?.map((comment) => {
					const commentReactions =
						reactions?.filter((reaction) => reaction.target_type === "comment" && reaction.target_id === comment.id) ?? [];
					return (
						<Card key={comment.id} className="space-y-4">
							<p className="whitespace-pre-wrap text-[var(--foreground)]/90">{comment.content}</p>
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs text-[var(--muted)]">{formatDate(comment.created_at, locale)}</p>
								<p className="text-xs text-[var(--muted)]">
									{commentReactions.length} {locale === "id" ? "reaksi" : "reactions"}
								</p>
							</div>
							<ReactionBar targetType="comment" targetId={comment.id} />
						</Card>
					);
				})}
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
