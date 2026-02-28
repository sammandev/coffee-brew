import { apiError, apiOk } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";
import { requireSessionContext } from "@/lib/auth";
import { assertPermission } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { moderationSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const body = await request.json();
	const parsed = moderationSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid moderation payload", 400, parsed.error.message);
	}

	const resource = parsed.data.targetType === "brew" ? "brews" : "forum";

	try {
		await assertPermission(session.role, resource, "moderate");
	} catch {
		return apiError("Forbidden", 403);
	}

	const supabase = await createSupabaseServerClient();

	if (parsed.data.targetType === "brew") {
		const { error } = await supabase
			.from("brews")
			.update({ status: parsed.data.hide ? "hidden" : "published" })
			.eq("id", parsed.data.targetId);

		if (error) {
			return apiError("Could not update brew visibility", 400, error.message);
		}
	}

	if (parsed.data.targetType === "thread") {
		const { error } = await supabase
			.from("forum_threads")
			.update({ status: parsed.data.hide ? "hidden" : "visible" })
			.eq("id", parsed.data.targetId);

		if (error) {
			return apiError("Could not update thread visibility", 400, error.message);
		}
	}

	if (parsed.data.targetType === "comment") {
		const { error } = await supabase
			.from("forum_comments")
			.update({ status: parsed.data.hide ? "hidden" : "visible" })
			.eq("id", parsed.data.targetId);

		if (error) {
			return apiError("Could not update comment visibility", 400, error.message);
		}
	}

	await supabase.from("moderation_events").insert({
		actor_id: session.userId,
		target_type: parsed.data.targetType,
		target_id: parsed.data.targetId,
		action: parsed.data.hide ? "hide" : "unhide",
		reason: parsed.data.reason ?? null,
	});

	await logAuditEvent({
		actorId: session.userId,
		action: `moderation.${parsed.data.hide ? "hide" : "unhide"}`,
		targetType: parsed.data.targetType,
		targetId: parsed.data.targetId,
		metadata: {
			reason: parsed.data.reason,
		},
	});

	return apiOk({ success: true });
}
