import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NotificationEventType = "comment" | "reaction" | "reply" | "review";

export interface NotificationInsertInput {
	actorId?: string | null;
	body: string;
	eventType: NotificationEventType;
	linkPath: string;
	metadata?: Record<string, unknown>;
	recipientId: string;
	title: string;
}

export function buildRecipientIds(recipientCandidates: Array<string | null | undefined>, actorId?: string | null) {
	const unique = new Set<string>();

	for (const recipientId of recipientCandidates) {
		if (!recipientId) continue;
		if (actorId && recipientId === actorId) continue;
		unique.add(recipientId);
	}

	return Array.from(unique);
}

export async function createNotifications(entries: NotificationInsertInput[]) {
	if (entries.length === 0) {
		return;
	}

	const dedupeKeys = new Set<string>();
	const rows = entries
		.filter((entry) => entry.recipientId.trim().length > 0)
		.filter((entry) => {
			const key = `${entry.recipientId}:${entry.eventType}:${entry.linkPath}`;
			if (dedupeKeys.has(key)) {
				return false;
			}
			dedupeKeys.add(key);
			return true;
		})
		.map((entry) => ({
			recipient_id: entry.recipientId,
			actor_id: entry.actorId ?? null,
			event_type: entry.eventType,
			title: entry.title,
			body: entry.body,
			link_path: entry.linkPath,
			metadata: entry.metadata ?? {},
		}));

	if (rows.length === 0) {
		return;
	}

	const { error } = await createSupabaseAdminClient().from("user_notifications").insert(rows);
	if (error) {
		console.error("[notifications] failed to insert notification rows", error.message);
	}
}
