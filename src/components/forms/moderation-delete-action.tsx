"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/ui/delete-modal";

interface ModerationDeleteActionProps {
	targetType: "brew" | "thread" | "comment";
	targetId: string;
}

export function ModerationDeleteAction({ targetType, targetId }: ModerationDeleteActionProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onConfirm() {
		setSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/moderation/delete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				targetType,
				targetId,
				reason: "Deleted by superuser from moderation page",
			}),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menghapus konten." : "Could not delete content."));
			setSubmitting(false);
			return;
		}

		setSubmitting(false);
		setOpen(false);
		router.refresh();
	}

	return (
		<>
			<div className="space-y-1">
				<Button type="button" size="sm" variant="destructive" onClick={() => setOpen(true)} disabled={submitting}>
					{submitting ? "..." : locale === "id" ? "Hapus" : "Delete"}
				</Button>
				{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
			</div>

			<DeleteModal
				open={open}
				onClose={() => setOpen(false)}
				onConfirm={onConfirm}
				isSubmitting={submitting}
				title={locale === "id" ? "Hapus Konten" : "Delete Content"}
				description={
					locale === "id"
						? "Konten ini akan dihapus permanen bersama data turunan yang terkait."
						: "This content will be permanently deleted along with related dependent data."
				}
				confirmLabel={locale === "id" ? "Hapus Permanen" : "Delete Permanently"}
			/>
		</>
	);
}
