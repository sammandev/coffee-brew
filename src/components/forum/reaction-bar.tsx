"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { FORUM_REACTION_TYPES } from "@/lib/constants";

interface ReactionBarProps {
	targetType: "thread" | "comment";
	targetId: string;
}

const reactionLabel: Record<(typeof FORUM_REACTION_TYPES)[number], string> = {
	like: "👍",
	coffee: "☕",
	fire: "🔥",
	mindblown: "🤯",
};

export function ReactionBar({ targetType, targetId }: ReactionBarProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [loading, setLoading] = useState<string | null>(null);

	async function addReaction(reaction: (typeof FORUM_REACTION_TYPES)[number]) {
		setLoading(reaction);

		await fetch("/api/forum/reactions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ targetType, targetId, reaction }),
		});

		setLoading(null);
		router.refresh();
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{FORUM_REACTION_TYPES.map((reaction) => (
				<button
					key={reaction}
					type="button"
					disabled={loading !== null}
					onClick={() => addReaction(reaction)}
					className="rounded-full border bg-[var(--surface)] px-3 py-1 text-sm hover:bg-[var(--sand)]/20"
					title={locale === "id" ? "Tambah reaksi" : "Add reaction"}
				>
					{reactionLabel[reaction]} {loading === reaction ? "..." : ""}
				</button>
			))}
		</div>
	);
}
