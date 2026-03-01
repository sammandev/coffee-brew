"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ForumReportActionProps {
	targetId: string;
	targetType: "thread" | "comment" | "reply";
}

export function ForumReportAction({ targetId, targetType }: ForumReportActionProps) {
	const { locale } = useAppPreferences();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [detail, setDetail] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit() {
		setSubmitting(true);
		setError(null);
		const response = await fetch("/api/forum/reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				targetType,
				targetId,
				reason,
				detail,
			}),
		}).catch(() => null);
		setSubmitting(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal mengirim laporan." : "Could not submit report."));
			return;
		}
		setOpen(false);
		setReason("");
		setDetail("");
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="rounded-full px-2.5 py-1 text-xs text-(--muted) transition hover:bg-(--sand)/20 hover:text-(--espresso)"
			>
				{locale === "id" ? "Laporkan" : "Report"}
			</button>
			<FormModal
				open={open}
				onClose={() => setOpen(false)}
				title={locale === "id" ? "Laporkan Konten" : "Report Content"}
				description={locale === "id" ? "Bantu moderator meninjau konten ini." : "Help moderators review this content."}
				footer={
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
							{locale === "id" ? "Batal" : "Cancel"}
						</Button>
						<Button type="button" onClick={() => void submit()} disabled={submitting || !reason.trim()}>
							{submitting ? <Loader2 size={14} className="animate-spin" /> : locale === "id" ? "Kirim" : "Submit"}
						</Button>
					</div>
				}
			>
				<div className="grid gap-3">
					<div>
						<Label htmlFor={`report-reason-${targetId}`}>{locale === "id" ? "Alasan" : "Reason"}</Label>
						<Input
							id={`report-reason-${targetId}`}
							value={reason}
							onChange={(event) => setReason(event.currentTarget.value)}
							maxLength={160}
						/>
						<p className="mt-1 text-right text-xs text-(--muted)">{reason.length}/160</p>
					</div>
					<div>
						<Label htmlFor={`report-detail-${targetId}`}>{locale === "id" ? "Detail Tambahan" : "Additional Details"}</Label>
						<Textarea
							id={`report-detail-${targetId}`}
							value={detail}
							onChange={(event) => setDetail(event.currentTarget.value)}
							rows={4}
							maxLength={1000}
						/>
						<p className="mt-1 text-right text-xs text-(--muted)">{detail.length}/1000</p>
					</div>
					{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
				</div>
			</FormModal>
		</>
	);
}
