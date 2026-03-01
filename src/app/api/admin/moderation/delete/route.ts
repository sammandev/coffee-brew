import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";
import { requireSessionContext } from "@/lib/auth";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { applyForumReputation } from "@/lib/forum-reputation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const moderationDeleteSchema = z.object({
	targetType: z.enum(["brew", "thread", "comment"]),
	targetId: z.string().uuid(),
	reason: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	if (session.role !== "superuser") {
		return apiError("Forbidden", 403);
	}

	const body = await request.json().catch(() => null);
	const parsed = moderationDeleteSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid moderation payload", 400, parsed.error.message);
	}

	const supabase = createSupabaseAdminClient();
	let targetTable: "brews" | "forum_threads" | "forum_comments";
	let authorId: string | null = null;
	if (parsed.data.targetType === "thread") {
		const { data: thread } = await supabase
			.from("forum_threads")
			.select("author_id")
			.eq("id", parsed.data.targetId)
			.maybeSingle();
		authorId = thread?.author_id ?? null;
	}
	if (parsed.data.targetType === "comment") {
		const { data: comment } = await supabase
			.from("forum_comments")
			.select("author_id")
			.eq("id", parsed.data.targetId)
			.maybeSingle();
		authorId = comment?.author_id ?? null;
	}

	if (parsed.data.targetType === "brew") {
		targetTable = "brews";
	} else if (parsed.data.targetType === "thread") {
		targetTable = "forum_threads";
	} else {
		targetTable = "forum_comments";
	}

	const { error } = await supabase.from(targetTable).delete().eq("id", parsed.data.targetId);
	if (error) {
		return apiError("Could not delete content", 400, error.message);
	}

	if (authorId && parsed.data.targetType === "thread") {
		await applyForumReputation({
			userId: authorId,
			actorId: session.userId,
			eventType: "thread_deleted_penalty",
			sourceType: "thread",
			sourceId: parsed.data.targetId,
			metadata: { reason: parsed.data.reason ?? null },
		});
	}
	if (authorId && parsed.data.targetType === "comment") {
		await applyForumReputation({
			userId: authorId,
			actorId: session.userId,
			eventType: "comment_deleted_penalty",
			sourceType: "comment",
			sourceId: parsed.data.targetId,
			metadata: { reason: parsed.data.reason ?? null },
		});
	}

	await supabase.from("moderation_events").insert({
		actor_id: session.userId,
		target_type: parsed.data.targetType,
		target_id: parsed.data.targetId,
		action: "delete",
		reason: parsed.data.reason ?? "Deleted by superuser",
	});

	await logAuditEvent({
		actorId: session.userId,
		action: "moderation.delete",
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
