"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface ForumReportItem {
	id: string;
	target_type: "thread" | "comment" | "reply";
	target_id: string;
	reason: string;
	detail: string | null;
	status: "open" | "resolved" | "dismissed";
	created_at: string;
}

interface ForumReportsManagerProps {
	reports: ForumReportItem[];
}

export function ForumReportsManager({ reports }: ForumReportsManagerProps) {
	const { locale } = useAppPreferences();
	const [workingId, setWorkingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function updateStatus(reportId: string, status: "open" | "resolved" | "dismissed") {
		setWorkingId(reportId);
		setError(null);
		const response = await fetch(`/api/admin/forum/reports/${reportId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				status,
				resolutionNote: `Updated from dashboard (${status})`,
			}),
		}).catch(() => null);

		setWorkingId(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not update report.");
			return;
		}
		window.location.reload();
	}

	return (
		<div className="space-y-3">
			{reports.map((report) => (
				<div key={report.id} className="rounded-2xl border bg-(--surface-elevated) p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="font-semibold text-(--espresso)">
								{report.target_type.toUpperCase()} · {report.reason}
							</p>
							<p className="text-xs text-(--muted)">
								{report.target_id} · {new Date(report.created_at).toLocaleString(locale === "id" ? "id-ID" : "en-US")}
							</p>
							{report.detail ? <p className="mt-2 text-sm text-(--foreground)/90">{report.detail}</p> : null}
						</div>
						<div className="flex items-center gap-2">
							<Select
								value={report.status}
								onChange={(event) =>
									void updateStatus(report.id, event.currentTarget.value as "open" | "resolved" | "dismissed")
								}
								disabled={workingId === report.id}
							>
								<option value="open">{locale === "id" ? "Terbuka" : "Open"}</option>
								<option value="resolved">{locale === "id" ? "Selesai" : "Resolved"}</option>
								<option value="dismissed">{locale === "id" ? "Ditolak" : "Dismissed"}</option>
							</Select>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => void updateStatus(report.id, "resolved")}
								disabled={workingId === report.id || report.status === "resolved"}
							>
								{workingId === report.id ? "..." : locale === "id" ? "Selesaikan" : "Resolve"}
							</Button>
						</div>
					</div>
				</div>
			))}
			{reports.length === 0 ? (
				<div className="rounded-2xl border border-dashed bg-(--surface-elevated) p-6 text-sm text-(--muted)">
					{locale === "id" ? "Belum ada laporan." : "No reports yet."}
				</div>
			) : null}
			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
		</div>
	);
}
