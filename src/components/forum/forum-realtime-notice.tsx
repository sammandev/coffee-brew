"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ForumRealtimeNotice() {
	const { t } = useAppPreferences();
	const router = useRouter();
	const [live, setLive] = useState(false);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();

		const channel = supabase
			.channel("forum-live")
			.on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_threads" }, () => {
				setLive(true);
			})
			.on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_comments" }, () => {
				setLive(true);
			})
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, []);

	if (!live) return null;

	return (
		<div className="flex items-center justify-between gap-3 rounded-2xl border border-(--accent)/30 bg-(--accent)/5 px-4 py-3">
			<div className="flex items-center gap-2">
				<span className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--accent) opacity-75" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-(--accent)" />
				</span>
				<p className="text-sm font-medium text-(--accent)">{t("forum.liveNotice")}</p>
			</div>
			<button
				type="button"
				className="rounded-full bg-(--accent)/10 px-3 py-1 text-xs font-semibold text-(--accent) transition hover:bg-(--accent)/20"
				onClick={() => router.refresh()}
			>
				{t("common.refresh")}
			</button>
		</div>
	);
}
