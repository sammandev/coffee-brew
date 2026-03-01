import { apiError, apiOk } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";
import { requireSessionContext } from "@/lib/auth";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { applyForumReputation } from "@/lib/forum-reputation";
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
		const { data: brew } = await supabase
			.from("brews")
			.select("id, owner_id")
			.eq("id", parsed.data.targetId)
			.maybeSingle();
		if (!brew) {
			return apiError("Brew not found", 404);
		}

		if (session.role === "admin" && brew.owner_id !== session.userId) {
			const { data: ownerRole } = await supabase.rpc("user_role", { user_id: brew.owner_id });
			if (ownerRole !== "user" && ownerRole !== "admin" && ownerRole !== "superuser") {
				return apiError("Forbidden", 403, "Unable to verify brew owner role.");
			}
			if (ownerRole === "superuser") {
				return apiError("Forbidden", 403, "Admin cannot moderate superuser brews.");
			}
		}

		const { error } = await supabase
			.from("brews")
			.update({ status: parsed.data.hide ? "hidden" : "published" })
			.eq("id", parsed.data.targetId);

		if (error) {
			return apiError("Could not update brew visibility", 400, error.message);
		}
	}

	if (parsed.data.targetType === "thread") {
		const { data: thread, error } = await supabase
			.from("forum_threads")
			.update({ status: parsed.data.hide ? "hidden" : "visible" })
			.eq("id", parsed.data.targetId)
			.select("id, author_id")
			.single();

		if (error) {
			return apiError("Could not update thread visibility", 400, error.message);
		}

		if (parsed.data.hide && thread.author_id) {
			await applyForumReputation({
				userId: thread.author_id,
				actorId: session.userId,
				eventType: "thread_hidden_penalty",
				sourceType: "thread",
				sourceId: thread.id,
				metadata: { reason: parsed.data.reason ?? null },
			});
		}
	}

	if (parsed.data.targetType === "comment") {
		const { data: comment, error } = await supabase
			.from("forum_comments")
			.update({ status: parsed.data.hide ? "hidden" : "visible" })
			.eq("id", parsed.data.targetId)
			.select("id, author_id")
			.single();

		if (error) {
			return apiError("Could not update comment visibility", 400, error.message);
		}

		if (parsed.data.hide && comment.author_id) {
			await applyForumReputation({
				userId: comment.author_id,
				actorId: session.userId,
				eventType: "comment_hidden_penalty",
				sourceType: "comment",
				sourceId: comment.id,
				metadata: { reason: parsed.data.reason ?? null },
			});
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

	if (parsed.data.targetType === "brew") {
		revalidatePublicCache([CACHE_TAGS.BREWS, CACHE_TAGS.BREW_DETAIL, CACHE_TAGS.LANDING]);
	} else {
		revalidatePublicCache([CACHE_TAGS.FORUM, CACHE_TAGS.LANDING]);
	}

	return apiOk({ success: true });
}
