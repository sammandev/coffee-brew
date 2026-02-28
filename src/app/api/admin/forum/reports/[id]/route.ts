import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createNotifications } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumReportUpdateSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = forumReportUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid report update payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data: existing } = await supabase
		.from("forum_reports")
		.select("id, reporter_id, target_type, target_id, status")
		.eq("id", id)
		.maybeSingle();
	if (!existing) {
		return apiError("Report not found", 404);
	}

	const isResolved = parsed.data.status === "resolved" || parsed.data.status === "dismissed";
	const { data, error } = await supabase
		.from("forum_reports")
		.update({
			status: parsed.data.status,
			assignee_id: parsed.data.assigneeId ?? permission.context.userId,
			resolution_note: parsed.data.resolutionNote ?? null,
			resolved_at: isResolved ? new Date().toISOString() : null,
		})
		.eq("id", id)
		.select("id, status, assignee_id, resolution_note, resolved_at, updated_at")
		.single();
	if (error) {
		return apiError("Could not update report", 400, error.message);
	}

	let linkPath = "/forum";
	if (existing.target_type === "thread") {
		linkPath = `/forum/${existing.target_id}`;
	}
	if (existing.target_type === "comment" || existing.target_type === "reply") {
		const { data: comment } = await supabase
			.from("forum_comments")
			.select("id, thread_id")
			.eq("id", existing.target_id)
			.maybeSingle();
		if (comment) {
			linkPath = `/forum/${comment.thread_id}#comment-${comment.id}`;
		}
	}

	await createNotifications([
		{
			recipientId: existing.reporter_id,
			actorId: permission.context.userId,
			eventType: "report_update",
			title: "Your forum report was updated",
			body: `Report status changed to ${parsed.data.status}.`,
			linkPath,
			metadata: {
				report_id: id,
				status: parsed.data.status,
			},
		},
	]);

	return apiOk({ report: data });
}
