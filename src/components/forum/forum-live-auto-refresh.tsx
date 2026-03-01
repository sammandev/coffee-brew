"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface ForumLiveAutoRefreshProps {
	tableFilters?: Array<{ table: "forum_threads" | "forum_comments" | "forum_reactions"; filter?: string }>;
}

export function ForumLiveAutoRefresh({ tableFilters }: ForumLiveAutoRefreshProps) {
	const router = useRouter();
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const channelRef = useRef<RealtimeChannel | null>(null);
	const generationRef = useRef(0);

	useEffect(() => {
		generationRef.current += 1;
		const generation = generationRef.current;
		const supabase = createSupabaseBrowserClient();
		if (channelRef.current) {
			void supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
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
					if (generation !== generationRef.current) return;
					if (timerRef.current) clearTimeout(timerRef.current);
					timerRef.current = setTimeout(() => router.refresh(), 350);
				},
			);
		}

		channel.subscribe();
		channelRef.current = channel;
		return () => {
			generationRef.current += 1;
			if (timerRef.current) clearTimeout(timerRef.current);
			channelRef.current = null;
			void supabase.removeChannel(channel);
		};
	}, [router, tableFilters]);

	return null;
}
