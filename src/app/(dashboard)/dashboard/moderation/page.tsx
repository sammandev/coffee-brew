import { ModerationToggle } from "@/components/forms/moderation-toggle";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function DashboardModerationPage() {
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);

	const [{ data: brews }, { data: threads }, { data: comments }] = await Promise.all([
		supabase.from("brews").select("id, name, status, created_at").order("created_at", { ascending: false }).limit(20),
		supabase
			.from("forum_threads")
			.select("id, title, status, created_at")
			.order("created_at", { ascending: false })
			.limit(20),
		supabase
			.from("forum_comments")
			.select("id, content, status, created_at")
			.order("created_at", { ascending: false })
			.limit(20),
	]);

	return (
		<div className="space-y-8">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Moderasi" : "Moderation"}</h1>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Racikan" : "Brews"}</h2>
				<div className="space-y-3">
					{brews?.map((brew) => (
						<Card key={brew.id} className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="font-semibold text-[var(--espresso)]">{brew.name}</p>
								<p className="text-xs text-[var(--muted)]">{formatDate(brew.created_at, locale)}</p>
							</div>
							<ModerationToggle targetType="brew" targetId={brew.id} hidden={brew.status === "hidden"} />
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
							<ModerationToggle targetType="thread" targetId={thread.id} hidden={thread.status === "hidden"} />
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
							<ModerationToggle targetType="comment" targetId={comment.id} hidden={comment.status === "hidden"} />
						</Card>
					))}
				</div>
			</section>
		</div>
	);
}
