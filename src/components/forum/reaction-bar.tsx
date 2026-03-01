"use client";

import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { ForumReactionType } from "@/lib/constants";
import { FORUM_REACTION_TYPES, REACTION_EMOJI } from "@/lib/constants";

interface ReactionBarProps {
	counts?: Partial<Record<ForumReactionType, number>>;
	myReaction?: ForumReactionType | null;
	targetType: "thread" | "comment";
	targetId: string;
}

export function ReactionBar({ counts, myReaction = null, targetType, targetId }: ReactionBarProps) {
	const { locale } = useAppPreferences();
	const [loading, setLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [localCounts, setLocalCounts] = useState<Partial<Record<ForumReactionType, number>>>(counts ?? {});
	const [localMyReaction, setLocalMyReaction] = useState<ForumReactionType | null>(myReaction);

	useEffect(() => {
		setLocalCounts(counts ?? {});
	}, [counts]);

	useEffect(() => {
		setLocalMyReaction(myReaction);
	}, [myReaction]);

	async function addReaction(reaction: (typeof FORUM_REACTION_TYPES)[number]) {
		const previousReaction = localMyReaction;
		const nextReaction = previousReaction === reaction ? null : reaction;
		const optimisticCounts = { ...localCounts };
		if (previousReaction) {
			optimisticCounts[previousReaction] = Math.max(0, (optimisticCounts[previousReaction] ?? 0) - 1);
		}
		if (nextReaction) {
			optimisticCounts[nextReaction] = (optimisticCounts[nextReaction] ?? 0) + 1;
		}

		setLocalMyReaction(nextReaction);
		setLocalCounts(optimisticCounts);
		setLoading(reaction);
		setError(null);

		const response = await fetch("/api/forum/reactions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ targetType, targetId, reaction }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menambahkan reaksi." : "Could not add reaction."));
			setLocalMyReaction(previousReaction);
			setLocalCounts(localCounts);
			setLoading(null);
			return;
		}

		const payload = (await response.json().catch(() => ({}))) as { reaction?: ForumReactionType | null };
		setLocalMyReaction((payload.reaction ?? nextReaction) as ForumReactionType | null);

		setLoading(null);
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-1.5">
				{FORUM_REACTION_TYPES.map((reaction) => {
					const count = localCounts[reaction] ?? 0;
					const isActive = localMyReaction === reaction;
					return (
						<button
							key={reaction}
							type="button"
							disabled={loading !== null}
							onClick={() => addReaction(reaction)}
							className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
								isActive
									? "bg-(--accent)/15 text-(--accent) ring-1 ring-(--accent)/40"
									: "bg-(--surface) text-(--muted) hover:bg-(--sand)/20 hover:text-(--espresso)"
							}`}
							title={locale === "id" ? "Tambah reaksi" : "Add reaction"}
						>
							<span className="text-sm">{REACTION_EMOJI[reaction]}</span>
							{count > 0 ? <span>{count}</span> : null}
							{loading === reaction ? <span className="animate-pulse">...</span> : null}
						</button>
					);
				})}
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
