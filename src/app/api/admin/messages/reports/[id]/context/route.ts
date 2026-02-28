import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { sanitizeForRender } from "@/lib/rich-text";
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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requireSuperuser();
	if (permission.response) return permission.response;
	const { id } = await params;

	const supabase = createSupabaseAdminClient();

	const { data: report } = await supabase
		.from("dm_reports")
		.select(
			"id, reporter_id, conversation_id, message_id, reason, detail, status, assignee_id, resolution_note, created_at, updated_at",
		)
		.eq("id", id)
		.maybeSingle();
	if (!report) {
		return apiError("Report not found", 404);
	}

	const [{ data: participants }, { data: messages }] = await Promise.all([
		supabase
			.from("dm_participants")
			.select("conversation_id, user_id, joined_at, profiles(id, display_name, email, avatar_url, is_verified)")
			.eq("conversation_id", report.conversation_id),
		supabase
			.from("dm_messages")
			.select(
				"id, conversation_id, sender_id, body_html, body_text, edited_at, created_at, dm_message_attachments(id, public_url, mime_type, size_bytes, metadata, created_at)",
			)
			.eq("conversation_id", report.conversation_id)
			.order("created_at", { ascending: true })
			.limit(200),
	]);

	const contextMessages = (messages ?? []).map((message) => ({
		id: message.id,
		conversation_id: message.conversation_id,
		sender_id: message.sender_id,
		body_html: sanitizeForRender(message.body_html),
		body_text: message.body_text,
		edited_at: message.edited_at,
		created_at: message.created_at,
		attachments: (message.dm_message_attachments ?? []).map((attachment) => ({
			id: attachment.id,
			public_url: attachment.public_url,
			mime_type: attachment.mime_type,
			size_bytes: attachment.size_bytes,
			metadata: attachment.metadata ?? {},
			created_at: attachment.created_at,
		})),
	}));

	return apiOk({
		report,
		participants: (participants ?? []).map((entry) => {
			const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
			return {
				user_id: entry.user_id,
				joined_at: entry.joined_at,
				profile: profile
					? {
							id: profile.id,
							display_name: profile.display_name?.trim() || profile.email || "Unknown User",
							email: profile.email,
							avatar_url: profile.avatar_url,
							is_verified: Boolean(profile.is_verified),
						}
					: null,
			};
		}),
		messages: contextMessages,
	});
}
