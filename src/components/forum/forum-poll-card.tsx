"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import type { ForumPollRecord } from "@/lib/types";

interface PollResultItem {
	option: string;
	count: number;
	percentage: number;
}

interface ForumPollCardProps {
	initialMyVote: number | null;
	initialResults: PollResultItem[];
	poll: ForumPollRecord;
	totalVotes: number;
}

export function ForumPollCard({ initialMyVote, initialResults, poll, totalVotes }: ForumPollCardProps) {
	const { locale } = useAppPreferences();
	const [myVote, setMyVote] = useState<number | null>(initialMyVote);
	const [results, setResults] = useState(initialResults);
	const [voteTotal, setVoteTotal] = useState(totalVotes);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const isClosed = poll.closes_at ? new Date(poll.closes_at).getTime() <= Date.now() : false;

	async function castVote(optionIndex: number) {
		if (loading || myVote !== null || isClosed) return;
		setLoading(true);
		setError(null);
		const response = await fetch(`/api/forum/polls/${poll.id}/vote`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ optionIndex }),
		}).catch(() => null);
		setLoading(false);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal mengirim vote." : "Could not submit vote."));
			return;
		}

		const nextTotal = voteTotal + 1;
		setMyVote(optionIndex);
		setVoteTotal(nextTotal);
		setResults((previous) =>
			previous.map((item, index) => {
				const count = item.count + (index === optionIndex ? 1 : 0);
				return {
					...item,
					count,
					percentage: nextTotal > 0 ? Math.round((count / nextTotal) * 1000) / 10 : 0,
				};
			}),
		);
	}

	return (
		<div className="space-y-3 rounded-2xl border bg-(--surface-elevated) p-4">
			<div className="space-y-1">
				<p className="text-xs font-semibold uppercase tracking-wide text-(--muted)">
					{locale === "id" ? "Polling" : "Poll"}
				</p>
				<h3 className="text-base font-semibold text-(--espresso)">{poll.question}</h3>
				<p className="text-xs text-(--muted)">
					{locale === "id" ? "Total vote" : "Total votes"}: {voteTotal}
					{poll.closes_at
						? ` · ${locale === "id" ? "Ditutup" : "Closes"} ${new Date(poll.closes_at).toLocaleString(locale === "id" ? "id-ID" : "en-US")}`
						: ""}
				</p>
			</div>
			<div className="space-y-2">
				{results.map((result, index) => (
					<div key={`${poll.id}-${index}`} className="space-y-1 rounded-xl border bg-(--surface) p-3">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-medium text-(--espresso)">{result.option}</p>
							<p className="text-xs text-(--muted)">
								{result.count} · {result.percentage.toFixed(1)}%
							</p>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-(--sand)/35">
							<div className="h-full bg-(--accent)" style={{ width: `${Math.max(0, Math.min(100, result.percentage))}%` }} />
						</div>
						<Button
							type="button"
							size="sm"
							variant={myVote === index ? "secondary" : "outline"}
							disabled={loading || myVote !== null || isClosed}
							onClick={() => void castVote(index)}
						>
							{myVote === index ? (locale === "id" ? "Vote Anda" : "Your vote") : locale === "id" ? "Pilih" : "Vote"}
						</Button>
					</div>
				))}
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
