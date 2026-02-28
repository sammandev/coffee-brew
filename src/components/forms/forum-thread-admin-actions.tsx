"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface ForumThreadAdminActionsProps {
	initialLocked: boolean;
	initialPinned: boolean;
	initialSubforumId: string;
	subforums: Array<{ id: string; name_en: string; name_id: string }>;
	threadId: string;
}

export function ForumThreadAdminActions({
	initialLocked,
	initialPinned,
	initialSubforumId,
	subforums,
	threadId,
}: ForumThreadAdminActionsProps) {
	const { locale } = useAppPreferences();
	const [locked, setLocked] = useState(initialLocked);
	const [pinned, setPinned] = useState(initialPinned);
	const [subforumId, setSubforumId] = useState(initialSubforumId);
	const [loading, setLoading] = useState<null | "lock" | "pin" | "move">(null);
	const [error, setError] = useState<string | null>(null);

	async function call(endpoint: string, body: Record<string, unknown>, action: "lock" | "pin" | "move") {
		setLoading(action);
		setError(null);
		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}).catch(() => null);
		setLoading(null);
		if (!response?.ok) {
			const payload = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(payload?.error ?? "Action failed.");
			return false;
		}
		return true;
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() =>
						void call(`/api/admin/forum/threads/${threadId}/lock`, { locked: !locked }, "lock").then((ok) => {
							if (ok) setLocked((current) => !current);
						})
					}
					disabled={loading !== null}
				>
					{loading === "lock"
						? "..."
						: locked
							? locale === "id"
								? "Buka Kunci"
								: "Unlock"
							: locale === "id"
								? "Kunci"
								: "Lock"}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() =>
						void call(`/api/admin/forum/threads/${threadId}/pin`, { pinned: !pinned }, "pin").then((ok) => {
							if (ok) setPinned((current) => !current);
						})
					}
					disabled={loading !== null}
				>
					{loading === "pin" ? "..." : pinned ? (locale === "id" ? "Lepas Pin" : "Unpin") : locale === "id" ? "Pin" : "Pin"}
				</Button>
				<div className="inline-flex items-center gap-2">
					<Select value={subforumId} onChange={(event) => setSubforumId(event.currentTarget.value)}>
						{subforums.map((subforum) => (
							<option key={subforum.id} value={subforum.id}>
								{locale === "id" ? subforum.name_id : subforum.name_en}
							</option>
						))}
					</Select>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() =>
							void call(`/api/admin/forum/threads/${threadId}/move`, { subforumId }, "move").then((ok) => {
								if (ok) window.location.reload();
							})
						}
						disabled={loading !== null}
					>
						{loading === "move" ? "..." : locale === "id" ? "Pindah" : "Move"}
					</Button>
				</div>
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
