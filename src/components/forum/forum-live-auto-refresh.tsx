"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface ForumLiveAutoRefreshProps {
	tableFilters?: Array<{ table: "forum_threads" | "forum_comments" | "forum_reactions"; filter?: string }>;
}

export function ForumLiveAutoRefresh({ tableFilters }: ForumLiveAutoRefreshProps) {
	const router = useRouter();
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase.channel(`forum-live-refresh:${Math.random().toString(36).slice(2, 8)}`);
		const tables = tableFilters && tableFilters.length > 0 ? tableFilters : [{ table: "forum_threads" as const }];

		for (const tableFilter of tables) {
			channel.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: tableFilter.table,
					filter: tableFilter.filter,
				},
				() => {
					if (timerRef.current) clearTimeout(timerRef.current);
					timerRef.current = setTimeout(() => router.refresh(), 350);
				},
			);
		}

		channel.subscribe();
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			void supabase.removeChannel(channel);
		};
	}, [router, tableFilters]);

	return null;
}
