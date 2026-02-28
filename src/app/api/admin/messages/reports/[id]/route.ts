import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dmReportUpdateSchema } from "@/lib/validators";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requireSuperuser();
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = dmReportUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid report update payload", 400, parsed.error.message);
	}

	const supabase = createSupabaseAdminClient();
	const now = new Date().toISOString();
	const patch = {
		status: parsed.data.status,
		resolution_note: parsed.data.resolutionNote ?? null,
		assignee_id: permission.session.userId,
		updated_at: now,
	};

	const { data, error } = await supabase
		.from("dm_reports")
		.update(patch)
		.eq("id", id)
		.select("id, status, resolution_note, assignee_id, updated_at")
		.single();
	if (error) {
		return apiError("Could not update report", 400, error.message);
	}

	return apiOk({ report: data });
}
