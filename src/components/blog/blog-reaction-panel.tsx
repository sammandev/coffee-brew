"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { FORUM_REACTION_TYPES, type ForumReactionType, REACTION_EMOJI } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface BlogReactionPanelProps {
	canReact: boolean;
	currentUserId?: string | null;
	initialCounts: Record<ForumReactionType, number>;
	initialMyReaction: ForumReactionType | null;
	loginHref: string;
	postId: string;
}

export function BlogReactionPanel({
	canReact,
	currentUserId = null,
	initialCounts,
	initialMyReaction,
	loginHref,
	postId,
}: BlogReactionPanelProps) {
	const { locale } = useAppPreferences();
	const [counts, setCounts] = useState<Record<ForumReactionType, number>>(initialCounts);
	const [myReaction, setMyReaction] = useState<ForumReactionType | null>(initialMyReaction);
	const [loadingReaction, setLoadingReaction] = useState<ForumReactionType | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let generation = 1;
		const supabase = createSupabaseBrowserClient();
		const channel: RealtimeChannel = supabase
			.channel(`blog-reactions:${postId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "blog_reactions", filter: `post_id=eq.${postId}` },
				(payload) => {
					if (generation !== 1) return;
					const nextRow = payload.new as Record<string, unknown> | undefined;
					const oldRow = payload.old as Record<string, unknown> | undefined;
					const actorId =
						typeof nextRow?.user_id === "string"
							? nextRow.user_id
							: typeof oldRow?.user_id === "string"
								? oldRow.user_id
								: null;
					if (currentUserId && actorId === currentUserId) return;

					const nextReaction =
						typeof nextRow?.reaction === "string" && FORUM_REACTION_TYPES.includes(nextRow.reaction as ForumReactionType)
							? (nextRow.reaction as ForumReactionType)
							: null;
					const oldReaction =
						typeof oldRow?.reaction === "string" && FORUM_REACTION_TYPES.includes(oldRow.reaction as ForumReactionType)
							? (oldRow.reaction as ForumReactionType)
							: null;

					setCounts((current) => {
						const nextCounts = { ...current };
						if (payload.eventType === "DELETE") {
							if (oldReaction) {
								nextCounts[oldReaction] = Math.max(0, (nextCounts[oldReaction] ?? 0) - 1);
							}
							return nextCounts;
						}

						if (payload.eventType === "INSERT") {
							if (nextReaction) {
								nextCounts[nextReaction] = (nextCounts[nextReaction] ?? 0) + 1;
							}
							return nextCounts;
						}

						if (payload.eventType === "UPDATE") {
							if (oldReaction && oldReaction !== nextReaction) {
								nextCounts[oldReaction] = Math.max(0, (nextCounts[oldReaction] ?? 0) - 1);
							}
							if (nextReaction && oldReaction !== nextReaction) {
								nextCounts[nextReaction] = (nextCounts[nextReaction] ?? 0) + 1;
							}
						}

						return nextCounts;
					});
				},
			)
			.subscribe();

		return () => {
			generation = 0;
			void supabase.removeChannel(channel);
		};
	}, [currentUserId, postId]);

	async function submitReaction(nextReaction: ForumReactionType) {
		if (!canReact) return;
		setLoadingReaction(nextReaction);
		setError(null);
		const previousReaction = myReaction;
		const optimisticReaction = previousReaction === nextReaction ? null : nextReaction;
		const optimisticCounts = { ...counts };
		if (previousReaction) {
			optimisticCounts[previousReaction] = Math.max(0, (optimisticCounts[previousReaction] ?? 0) - 1);
		}
		if (optimisticReaction) {
			optimisticCounts[optimisticReaction] = (optimisticCounts[optimisticReaction] ?? 0) + 1;
		}
		setCounts(optimisticCounts);
		setMyReaction(optimisticReaction);

		const response = await fetch("/api/blog/reactions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				postId,
				reaction: nextReaction,
			}),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal mengirim reaksi." : "Could not update reaction."));
			setCounts(counts);
			setMyReaction(previousReaction);
			setLoadingReaction(null);
			return;
		}

		const payload = (await response.json().catch(() => ({}))) as {
			reaction?: ForumReactionType | null;
		};
		const finalReaction = (payload.reaction ?? optimisticReaction ?? null) as ForumReactionType | null;
		setMyReaction(finalReaction);
		setLoadingReaction(null);
	}

	return (
		<section className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="font-heading text-lg text-(--espresso)">
					{locale === "id" ? "Reaksi Artikel" : "Article Reactions"}
				</h2>
				{!canReact ? (
					<Link href={loginHref} className="text-xs font-semibold text-(--accent) hover:underline">
						{locale === "id" ? "Masuk untuk bereaksi" : "Sign in to react"}
					</Link>
				) : null}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{FORUM_REACTION_TYPES.map((reactionType) => (
					<button
						key={reactionType}
						type="button"
						onClick={() => void submitReaction(reactionType)}
						disabled={!canReact || loadingReaction !== null}
						className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
							myReaction === reactionType
								? "border-(--accent) bg-(--accent)/15 text-(--accent)"
								: "border-(--border) bg-(--surface-elevated) text-foreground hover:bg-(--sand)/15"
						}`}
						aria-label={`${reactionType} reaction`}
					>
						<span>{REACTION_EMOJI[reactionType]}</span>
						<span>{counts[reactionType] ?? 0}</span>
						{loadingReaction === reactionType ? <span className="text-xs">...</span> : null}
					</button>
				))}
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</section>
	);
}
