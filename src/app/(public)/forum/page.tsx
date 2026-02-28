import Link from "next/link";
import { ForumRealtimeNotice } from "@/components/forum/forum-realtime-notice";
import { ThreadComposerModal } from "@/components/forum/thread-composer-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";
import { getForumThreads } from "@/lib/queries";
import { clampPlainText } from "@/lib/rich-text";
import { formatDate } from "@/lib/utils";

export default async function ForumPage() {
	const [{ t, locale }, threads, session] = await Promise.all([getServerI18n(), getForumThreads(), getSessionContext()]);

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<Badge>{t("nav.forum")}</Badge>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="font-heading text-4xl text-(--espresso)">{t("forum.title")}</h1>
					{session ? (
						<ThreadComposerModal
							title={t("forum.startDiscussion")}
							description={
								locale === "id"
									? "Buat thread baru untuk berbagi insight, pertanyaan, atau tips seduh."
									: "Create a new thread to share brewing insights, questions, or tips."
							}
							triggerLabel={locale === "id" ? "Mulai Diskusi" : "Start Discussion"}
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
			</header>

			<ForumRealtimeNotice />

			<div className="space-y-3">
				{threads.map((thread) => (
					<Link href={`/forum/${thread.id}`} key={thread.id}>
						<Card className="transition hover:-translate-y-1">
							<CardTitle>{thread.title}</CardTitle>
							{Array.isArray(thread.tags) && thread.tags.length > 0 && (
								<div className="mt-3 flex flex-wrap gap-2">
									{thread.tags.slice(0, 5).map((tag: string) => (
										<span key={`${thread.id}-${tag}`} className="rounded-full border px-2 py-0.5 text-xs text-(--muted)">
											#{tag}
										</span>
									))}
								</div>
							)}
							<CardDescription className="mt-2 line-clamp-2">{clampPlainText(thread.content, 180)}</CardDescription>
							<p className="mt-4 text-xs text-(--muted)">
								{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(thread.updated_at, locale)}
							</p>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
