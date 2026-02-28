import { FORUM_REPUTATION_POINTS } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ForumReputationEventType =
	| "thread_create"
	| "comment_create"
	| "reaction_received"
	| "thread_hidden_penalty"
	| "thread_deleted_penalty"
	| "comment_hidden_penalty"
	| "comment_deleted_penalty";

const POINTS_BY_EVENT: Record<ForumReputationEventType, number> = {
	thread_create: FORUM_REPUTATION_POINTS.threadCreate,
	comment_create: FORUM_REPUTATION_POINTS.commentCreate,
	reaction_received: FORUM_REPUTATION_POINTS.reactionReceived,
	thread_hidden_penalty: FORUM_REPUTATION_POINTS.threadHiddenPenalty,
	thread_deleted_penalty: FORUM_REPUTATION_POINTS.threadDeletedPenalty,
	comment_hidden_penalty: FORUM_REPUTATION_POINTS.commentHiddenPenalty,
	comment_deleted_penalty: FORUM_REPUTATION_POINTS.commentDeletedPenalty,
};

export async function applyForumReputation(params: {
	userId: string;
	eventType: ForumReputationEventType;
	actorId?: string | null;
	sourceType?: string | null;
	sourceId?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const delta = POINTS_BY_EVENT[params.eventType] ?? 0;
	if (!params.userId || delta === 0) return;

	const supabase = createSupabaseAdminClient();
	await supabase.rpc("increment_karma_points", {
		target_user_id: params.userId,
		points_delta: delta,
	});

	await supabase.from("forum_reputation_events").insert({
		user_id: params.userId,
		actor_id: params.actorId ?? null,
		event_type: params.eventType,
		points_delta: delta,
		source_type: params.sourceType ?? null,
		source_id: params.sourceId ?? null,
		metadata: params.metadata ?? {},
	});

	await syncUserBadges(params.userId);
}

export async function syncUserBadges(userId: string) {
	const supabase = createSupabaseAdminClient();
	const [{ data: profile }, { data: activeBadges }, { data: existingBadges }] = await Promise.all([
		supabase.from("profiles").select("karma_points").eq("id", userId).maybeSingle(),
		supabase.from("badge_definitions").select("id, min_points").eq("is_active", true),
		supabase.from("user_badges").select("badge_id").eq("user_id", userId),
	]);

	if (!profile || !activeBadges) return;
	const points = Number(profile.karma_points ?? 0);
	const expectedBadgeIds = new Set(
		activeBadges.filter((badge) => points >= Number(badge.min_points ?? 0)).map((badge) => badge.id),
	);
	const currentBadgeIds = new Set((existingBadges ?? []).map((badge) => badge.badge_id));

	const toInsert = Array.from(expectedBadgeIds).filter((badgeId) => !currentBadgeIds.has(badgeId));
	const toDelete = Array.from(currentBadgeIds).filter((badgeId) => !expectedBadgeIds.has(badgeId));

	if (toInsert.length > 0) {
		await supabase.from("user_badges").insert(
			toInsert.map((badgeId) => ({
				user_id: userId,
				badge_id: badgeId,
				awarded_by: null,
				metadata: { auto: true },
			})),
		);
	}

	if (toDelete.length > 0) {
		await supabase.from("user_badges").delete().eq("user_id", userId).in("badge_id", toDelete);
	}
}
