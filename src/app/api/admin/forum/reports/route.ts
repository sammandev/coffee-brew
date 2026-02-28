import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const url = new URL(request.url);
	const status = url.searchParams.get("status")?.trim();
	const limitRaw = Number(url.searchParams.get("limit") ?? 50);
	const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.trunc(limitRaw))) : 50;

	const supabase = await createSupabaseServerClient();
	let query = supabase
		.from("forum_reports")
		.select(
			"id, reporter_id, target_type, target_id, reason, detail, status, assignee_id, resolution_note, created_at, updated_at",
		)
		.order("created_at", { ascending: false })
		.limit(limit);

	if (status === "open" || status === "resolved" || status === "dismissed") {
		query = query.eq("status", status);
	}

	const { data, error } = await query;
	if (error) {
		return apiError("Could not load forum reports", 400, error.message);
	}

	return apiOk({ reports: data ?? [] });
}
