"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { WarningModal } from "@/components/ui/warning-modal";

interface ModerationToggleProps {
	targetType: "brew" | "thread" | "comment";
	targetId: string;
	hidden: boolean;
}

export function ModerationToggle({ targetType, targetId, hidden }: ModerationToggleProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [confirmHideOpen, setConfirmHideOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function toggle() {
		setConfirmHideOpen(false);
		setLoading(true);
		setError(null);
		const response = await fetch("/api/admin/moderation/hide", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				targetType,
				targetId,
				hide: !hidden,
				reason: hidden ? "Restore content" : "Hidden by moderator",
			}),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal memperbarui moderasi." : "Could not update moderation."));
			setLoading(false);
			return;
		}
		setLoading(false);
		router.refresh();
	}

	return (
		<>
			<Button
				onClick={() => (hidden ? toggle() : setConfirmHideOpen(true))}
				size="sm"
				variant={hidden ? "secondary" : "outline"}
				disabled={loading}
			>
				{loading ? "..." : hidden ? (locale === "id" ? "Tampilkan" : "Unhide") : locale === "id" ? "Sembunyikan" : "Hide"}
			</Button>

			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}

			<WarningModal
				open={confirmHideOpen}
				onClose={() => setConfirmHideOpen(false)}
				onConfirm={toggle}
				isSubmitting={loading}
				title={locale === "id" ? "Sembunyikan Konten" : "Hide Content"}
				description={
					locale === "id"
						? "Konten ini akan disembunyikan dari tampilan publik sampai ditampilkan kembali."
						: "This content will be hidden from public view until restored."
				}
				confirmLabel={locale === "id" ? "Sembunyikan" : "Hide"}
			/>
		</>
	);
}
