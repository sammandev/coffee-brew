import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireSuperuser() {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return { response: apiError("Unauthorized", 401) };
	}
	if (session.role !== "superuser") {
		return { response: apiError("Forbidden", 403) };
	}
	return { session };
}

export async function GET() {
	const permission = await requireSuperuser();
	if (permission.response) return permission.response;

	const supabase = createSupabaseAdminClient();
	const { data, error } = await supabase
		.from("dm_reports")
		.select(
			"id, reporter_id, conversation_id, message_id, reason, detail, status, assignee_id, resolution_note, created_at, updated_at",
		)
		.order("created_at", { ascending: false })
		.limit(200);

	if (error) {
		return apiError("Could not load DM reports", 400, error.message);
	}

	return apiOk({ reports: data ?? [] });
}
