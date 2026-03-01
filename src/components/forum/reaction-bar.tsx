"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
	const router = useRouter();
	const [loading, setLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function addReaction(reaction: (typeof FORUM_REACTION_TYPES)[number]) {
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
			setLoading(null);
			return;
		}

		setLoading(null);
		router.refresh();
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				{FORUM_REACTION_TYPES.map((reaction) => (
					<button
						key={reaction}
						type="button"
						disabled={loading !== null}
						onClick={() => addReaction(reaction)}
						className={`rounded-full border px-3 py-1 text-sm transition hover:bg-(--sand)/20 disabled:opacity-60 ${
							myReaction === reaction ? "border-(--accent) bg-(--accent)/15 text-(--accent)" : "bg-(--surface) text-foreground"
						}`}
						title={locale === "id" ? "Tambah reaksi" : "Add reaction"}
					>
						{REACTION_EMOJI[reaction]} {counts?.[reaction] ?? 0} {loading === reaction ? "..." : ""}
					</button>
				))}
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
