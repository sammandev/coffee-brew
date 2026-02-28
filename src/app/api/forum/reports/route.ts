import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumReportCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const body = await request.json().catch(() => null);
	const parsed = forumReportCreateSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid report payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_reports")
		.insert({
			reporter_id: permission.context.userId,
			target_type: parsed.data.targetType,
			target_id: parsed.data.targetId,
			reason: parsed.data.reason,
			detail: parsed.data.detail ?? null,
			status: "open",
			metadata: {},
		})
		.select("id, status, created_at")
		.single();

	if (error) {
		return apiError("Could not submit report", 400, error.message);
	}

	return apiOk({ report: data }, 201);
}
