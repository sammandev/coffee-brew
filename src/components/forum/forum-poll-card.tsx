"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
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
		<div className="space-y-4 rounded-2xl border bg-(--surface-elevated) p-5 sm:p-6">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<span className="text-lg">📊</span>
					<p className="text-xs font-semibold uppercase tracking-wide text-(--accent)">
						{locale === "id" ? "Polling" : "Poll"}
					</p>
				</div>
				<h3 className="text-lg font-semibold text-(--espresso)">{poll.question}</h3>
				<p className="text-xs text-(--muted)">
					{voteTotal} {locale === "id" ? "vote" : "votes"}
					{poll.closes_at
						? ` · ${isClosed ? (locale === "id" ? "Ditutup" : "Closed") : locale === "id" ? "Ditutup pada" : "Closes"} ${new Date(poll.closes_at).toLocaleString(locale === "id" ? "id-ID" : "en-US")}`
						: ""}
				</p>
			</div>
			<div className="space-y-2.5">
				{results.map((result, index) => {
					const isMyVote = myVote === index;
					const canVote = !loading && myVote === null && !isClosed;
					return (
						<button
							key={`${poll.id}-${index}`}
							type="button"
							disabled={!canVote}
							onClick={() => void castVote(index)}
							className={`group relative w-full overflow-hidden rounded-xl border p-3 text-left transition ${
								isMyVote
									? "border-(--accent)/40 ring-1 ring-(--accent)/20"
									: canVote
										? "hover:border-(--accent)/30 hover:shadow-sm"
										: ""
							}`}
						>
							{/* Progress background */}
							<div
								className={`absolute inset-y-0 left-0 transition-all duration-500 ${isMyVote ? "bg-(--accent)/12" : "bg-(--sand)/20"}`}
								style={{ width: `${Math.max(0, Math.min(100, result.percentage))}%` }}
							/>
							<div className="relative flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									{isMyVote ? <span className="text-xs">✓</span> : null}
									<span className="text-sm font-medium text-(--espresso)">{result.option}</span>
								</div>
								<span className="shrink-0 text-xs font-semibold text-(--muted)">
									{result.count} ({result.percentage.toFixed(1)}%)
								</span>
							</div>
						</button>
					);
				})}
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
