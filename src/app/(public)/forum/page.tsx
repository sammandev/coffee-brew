import Link from "next/link";
import { ForumRealtimeNotice } from "@/components/forum/forum-realtime-notice";
import { ThreadComposer } from "@/components/forum/thread-composer";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";
import { getForumThreads } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function ForumPage() {
	const [{ t, locale }, threads, session] = await Promise.all([getServerI18n(), getForumThreads(), getSessionContext()]);

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_340px]">
			<div className="space-y-4">
				<header>
					<Badge>{t("nav.forum")}</Badge>
					<h1 className="mt-2 font-heading text-4xl text-[var(--espresso)]">{t("forum.title")}</h1>
					<p className="text-[var(--muted)]">{t("forum.subtitle")}</p>
				</header>

				<ForumRealtimeNotice />

				<div className="space-y-3">
					{threads.map((thread) => (
						<Link href={`/forum/${thread.id}`} key={thread.id}>
							<Card className="transition hover:-translate-y-1">
								<CardTitle>{thread.title}</CardTitle>
								<CardDescription className="mt-2 line-clamp-2">{thread.content}</CardDescription>
								<p className="mt-4 text-xs text-[var(--muted)]">
									{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(thread.updated_at, locale)}
								</p>
							</Card>
						</Link>
					))}
				</div>
			</div>

			<aside className="space-y-4">
				{session ? (
					<ThreadComposer />
				) : (
					<Card>
						<CardTitle>{t("forum.loginToPost")}</CardTitle>
						<CardDescription className="mt-2">
							{locale === "id"
								? "Pengunjung publik bisa membaca thread. Menulis membutuhkan autentikasi."
								: "Public users can read threads. Posting requires authentication."}
						</CardDescription>
						<Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] underline">
							{locale === "id" ? "Menuju Login" : "Go to Login"}
						</Link>
					</Card>
				)}
			</aside>
		</div>
	);
}
