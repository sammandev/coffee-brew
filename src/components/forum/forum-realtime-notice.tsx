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
		<div className="mb-4 rounded-2xl border border-(--accent) bg-(--accent)/10 p-3 text-sm text-(--accent)">
			{t("forum.liveNotice")}{" "}
			<button type="button" className="underline" onClick={() => router.refresh()}>
				{t("common.refresh")}
			</button>
		</div>
	);
}
