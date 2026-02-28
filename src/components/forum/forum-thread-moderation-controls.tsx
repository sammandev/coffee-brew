"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";

interface ForumThreadModerationControlsProps {
	initialLocked: boolean;
	initialPinned: boolean;
	isModerator: boolean;
	threadId: string;
}

export function ForumThreadModerationControls({
	initialLocked,
	initialPinned,
	isModerator,
	threadId,
}: ForumThreadModerationControlsProps) {
	const { locale } = useAppPreferences();
	const [locked, setLocked] = useState(initialLocked);
	const [pinned, setPinned] = useState(initialPinned);
	const [loadingAction, setLoadingAction] = useState<null | "lock" | "pin">(null);
	const [error, setError] = useState<string | null>(null);

	if (!isModerator) return null;

	async function toggleLock() {
		setLoadingAction("lock");
		setError(null);
		const response = await fetch(`/api/admin/forum/threads/${threadId}/lock`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ locked: !locked }),
		}).catch(() => null);
		setLoadingAction(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not update lock.");
			return;
		}
		setLocked((current) => !current);
	}

	async function togglePin() {
		setLoadingAction("pin");
		setError(null);
		const response = await fetch(`/api/admin/forum/threads/${threadId}/pin`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ pinned: !pinned }),
		}).catch(() => null);
		setLoadingAction(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not update pin.");
			return;
		}
		setPinned((current) => !current);
	}

	return (
		<div className="space-y-2 rounded-2xl border bg-(--surface-elevated) p-3">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => void toggleLock()}
					disabled={loadingAction !== null}
				>
					{loadingAction === "lock"
						? "..."
						: locked
							? locale === "id"
								? "Buka Kunci"
								: "Unlock"
							: locale === "id"
								? "Kunci Thread"
								: "Lock Thread"}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => void togglePin()}
					disabled={loadingAction !== null}
				>
					{loadingAction === "pin"
						? "..."
						: pinned
							? locale === "id"
								? "Lepas Pin"
								: "Unpin"
							: locale === "id"
								? "Pin Thread"
								: "Pin Thread"}
				</Button>
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
