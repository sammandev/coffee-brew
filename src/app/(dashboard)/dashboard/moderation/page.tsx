import { requireRole } from "@/components/auth-guard";
import { ForumThreadAdminActions } from "@/components/forms/forum-thread-admin-actions";
import { ForumThreadMergeForm } from "@/components/forms/forum-thread-merge-form";
import { ModerationDeleteAction } from "@/components/forms/moderation-delete-action";
import { ModerationToggle } from "@/components/forms/moderation-toggle";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ForumSubforum } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default async function DashboardModerationPage() {
	const [session, { locale }, supabase] = await Promise.all([
		requireRole({ minRole: "admin", onUnauthorized: "forbidden" }),
		getServerI18n(),
		createSupabaseServerClient(),
	]);

	const [{ data: brews }, { data: threads }, { data: comments }, { data: subforums }] = await Promise.all([
		supabase
			.from("brews")
			.select("id, owner_id, name, status, created_at")
			.order("created_at", { ascending: false })
			.limit(20),
		supabase
			.from("forum_threads")
			.select("id, title, status, created_at, is_locked, is_pinned, subforum_id")
			.order("created_at", { ascending: false })
			.limit(20),
		supabase
			.from("forum_comments")
			.select("id, content, status, created_at")
			.order("created_at", { ascending: false })
			.limit(20),
		supabase
			.from("forum_subforums")
			.select("id, name_en, name_id")
			.eq("is_visible", true)
			.order("order_index", { ascending: true }),
	]);
	const ownerRoles = new Map<string, string>();
	for (const ownerId of Array.from(new Set((brews ?? []).map((brew) => brew.owner_id)))) {
		const { data: roleName } = await supabase.rpc("user_role", { user_id: ownerId });
		if (typeof roleName === "string") {
			ownerRoles.set(ownerId, roleName);
		}
	}

	return (
		<div className="space-y-8">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Moderasi" : "Moderation"}</h1>
			{session.role === "superuser" ? <ForumThreadMergeForm /> : null}

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Racikan" : "Brews"}</h2>
				<div className="space-y-3">
					{brews?.map((brew) => (
						<Card key={brew.id} className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="font-semibold text-[var(--espresso)]">{brew.name}</p>
								<p className="text-xs text-[var(--muted)]">{formatDate(brew.created_at, locale)}</p>
							</div>
							{session.role === "admin" &&
							brew.owner_id !== session.userId &&
							ownerRoles.get(brew.owner_id) === "superuser" ? (
								<p className="text-xs text-[var(--muted)]">
									{locale === "id"
										? "Brew superuser tidak dapat dimoderasi admin."
										: "Superuser brews cannot be moderated by admin."}
								</p>
							) : (
								<div className="flex flex-wrap items-center gap-2">
									<ModerationToggle targetType="brew" targetId={brew.id} hidden={brew.status === "hidden"} />
									{session.role === "superuser" ? <ModerationDeleteAction targetType="brew" targetId={brew.id} /> : null}
								</div>
							)}
						</Card>
					))}
				</div>
			</section>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Thread" : "Threads"}</h2>
				<div className="space-y-3">
					{threads?.map((thread) => (
						<Card key={thread.id} className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="font-semibold text-[var(--espresso)]">{thread.title}</p>
								<p className="text-xs text-[var(--muted)]">{formatDate(thread.created_at, locale)}</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<ModerationToggle targetType="thread" targetId={thread.id} hidden={thread.status === "hidden"} />
								<ForumThreadAdminActions
									threadId={thread.id}
									initialLocked={Boolean(thread.is_locked)}
									initialPinned={Boolean(thread.is_pinned)}
									initialSubforumId={thread.subforum_id}
									subforums={(subforums ?? []) as Pick<ForumSubforum, "id" | "name_en" | "name_id">[]}
								/>
								{session.role === "superuser" ? <ModerationDeleteAction targetType="thread" targetId={thread.id} /> : null}
							</div>
						</Card>
					))}
				</div>
			</section>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Komentar" : "Comments"}</h2>
				<div className="space-y-3">
					{comments?.map((comment) => (
						<Card key={comment.id} className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="line-clamp-2 text-sm text-[var(--foreground)]/90">{clampPlainText(comment.content, 220)}</p>
								<p className="text-xs text-[var(--muted)]">{formatDate(comment.created_at, locale)}</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<ModerationToggle targetType="comment" targetId={comment.id} hidden={comment.status === "hidden"} />
								{session.role === "superuser" ? <ModerationDeleteAction targetType="comment" targetId={comment.id} /> : null}
							</div>
						</Card>
					))}
				</div>
			</section>
		</div>
	);
}
