import { requireRole } from "@/components/auth-guard";
import { ForumReportsManager } from "@/components/forms/forum-reports-manager";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ForumReportRecord } from "@/lib/types";

export default async function DashboardModerationReportsPage() {
	await requireRole({ minRole: "admin", onUnauthorized: "forbidden" });
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);
	const { data: reports } = await supabase
		.from("forum_reports")
		.select("id, target_type, target_id, reason, detail, status, created_at")
		.order("created_at", { ascending: false })
		.limit(200);

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-(--espresso)">
				{locale === "id" ? "Antrian Laporan Forum" : "Forum Report Queue"}
			</h1>
			<ForumReportsManager reports={(reports ?? []) as ForumReportRecord[]} />
		</div>
	);
}
