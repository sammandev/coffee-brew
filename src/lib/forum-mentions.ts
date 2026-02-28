import { createNotifications } from "@/lib/notifications";
import { toPlainText } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MENTION_PATTERN = /(^|\s)@([a-z0-9_]{3,32})/gi;

export function extractMentionHandles(content: string) {
	const plain = toPlainText(content).toLowerCase();
	const handles = new Set<string>();
	let match: RegExpExecArray | null = MENTION_PATTERN.exec(plain);
	while (match) {
		const handle = match[2]?.trim();
		if (handle) handles.add(handle);
		match = MENTION_PATTERN.exec(plain);
	}
	return Array.from(handles);
}

export async function notifyMentions(params: {
	actorId: string;
	actorName: string;
	content: string;
	linkPath: string;
	title: string;
	metadata?: Record<string, unknown>;
}) {
	const handles = extractMentionHandles(params.content);
	if (handles.length === 0) return;

	const supabase = await createSupabaseServerClient();
	const { data: profiles } = await supabase.from("profiles").select("id, mention_handle").in("mention_handle", handles);

	if (!profiles || profiles.length === 0) return;
	const recipientIds = profiles.map((profile) => profile.id).filter((id) => id !== params.actorId);
	if (recipientIds.length === 0) return;

	await createNotifications(
		recipientIds.map((recipientId) => ({
			recipientId,
			actorId: params.actorId,
			eventType: "mention",
			title: params.title,
			body: `${params.actorName} mentioned you in a discussion.`,
			linkPath: params.linkPath,
			metadata: {
				...(params.metadata ?? {}),
				mention: true,
			},
		})),
	);
}
