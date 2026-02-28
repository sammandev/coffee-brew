"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForumThreadMergeForm() {
	const { locale } = useAppPreferences();
	const [sourceThreadId, setSourceThreadId] = useState("");
	const [targetThreadId, setTargetThreadId] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function mergeThreads() {
		setSubmitting(true);
		setError(null);
		const response = await fetch("/api/admin/forum/threads/merge", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				sourceThreadId,
				targetThreadId,
			}),
		}).catch(() => null);
		setSubmitting(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not merge threads.");
			return;
		}
		window.location.reload();
	}

	return (
		<div className="space-y-3 rounded-2xl border bg-(--surface-elevated) p-4">
			<h2 className="font-heading text-xl text-(--espresso)">
				{locale === "id" ? "Gabungkan Thread (Superuser)" : "Merge Threads (Superuser)"}
			</h2>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="merge-source-thread">{locale === "id" ? "Thread Sumber" : "Source Thread ID"}</Label>
					<Input
						id="merge-source-thread"
						value={sourceThreadId}
						onChange={(event) => setSourceThreadId(event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="merge-target-thread">{locale === "id" ? "Thread Target" : "Target Thread ID"}</Label>
					<Input
						id="merge-target-thread"
						value={targetThreadId}
						onChange={(event) => setTargetThreadId(event.currentTarget.value)}
					/>
				</div>
			</div>
			<div className="flex justify-end">
				<Button
					type="button"
					onClick={() => void mergeThreads()}
					disabled={submitting || !sourceThreadId.trim() || !targetThreadId.trim()}
				>
					{submitting ? "..." : locale === "id" ? "Gabungkan" : "Merge"}
				</Button>
			</div>
			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
		</div>
	);
}
