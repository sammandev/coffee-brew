"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface BrewReviewsLiveRefreshProps {
	brewId: string;
}

export function BrewReviewsLiveRefresh({ brewId }: BrewReviewsLiveRefreshProps) {
	const router = useRouter();
	const channelRef = useRef<RealtimeChannel | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const generationRef = useRef(0);

	useEffect(() => {
		generationRef.current += 1;
		const generation = generationRef.current;
		const supabase = createSupabaseBrowserClient();

		if (channelRef.current) {
			void supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}

		const channel = supabase
			.channel(`brew-reviews:${brewId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "brew_reviews", filter: `brew_id=eq.${brewId}` },
				() => {
					if (generation !== generationRef.current) return;
					if (timerRef.current) {
						clearTimeout(timerRef.current);
					}
					timerRef.current = setTimeout(() => {
						router.refresh();
					}, 300);
				},
			)
			.subscribe();

		channelRef.current = channel;

		return () => {
			generationRef.current += 1;
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			channelRef.current = null;
			void supabase.removeChannel(channel);
		};
	}, [brewId, router]);

	return null;
}
