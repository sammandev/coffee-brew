import { apiError, apiOk } from "@/lib/api";
import { normalizeDmBodyText, parseDmStoragePath, sanitizeDmBody } from "@/lib/direct-messages";
import {
	enforceDmRateLimits,
	isConversationParticipant,
	refreshConversationLatestMessage,
	requireActiveDmSession,
} from "@/lib/dm-service";
import { isSuspiciousForumContent } from "@/lib/forum-spam";
import { sanitizeForRender, validatePlainTextLength } from "@/lib/rich-text";
import { dmMessageCreateSchema, dmMessageListQuerySchema } from "@/lib/validators";

function firstParam(value: string | string[] | null) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { id } = await params;

	const isParticipant = await isConversationParticipant(supabase, id, context.userId);
	if (!isParticipant) {
		return apiError("Conversation not found", 404);
	}

	const url = new URL(request.url);
	const parsed = dmMessageListQuerySchema.safeParse({
		limit: firstParam(url.searchParams.getAll("limit")) || "40",
		cursor: firstParam(url.searchParams.getAll("cursor")) || undefined,
	});
	if (!parsed.success) {
		return apiError("Invalid query", 400, parsed.error.message);
	}

	const { limit, cursor } = parsed.data;

	const query = supabase
		.from("dm_messages")
		.select(
			`
      id,
      conversation_id,
      sender_id,
      body_html,
      body_text,
      edited_at,
      created_at,
      dm_message_attachments (
        id,
        public_url,
        mime_type,
        size_bytes,
        metadata,
        created_at
      )
    `,
		)
		.eq("conversation_id", id)
		.order("created_at", { ascending: false })
		.limit(limit);

	const scopedQuery = cursor ? query.lt("created_at", cursor) : query;
	const { data, error } = await scopedQuery;
	if (error) {
		return apiError("Could not fetch messages", 400, error.message);
	}

	const senderIds = Array.from(new Set((data ?? []).map((message) => message.sender_id)));
	const [{ data: senderProfiles }, { data: participantRows }] = await Promise.all([
		senderIds.length > 0
			? supabase.from("profiles").select("id, display_name, email, avatar_url, is_verified").in("id", senderIds)
			: Promise.resolve({ data: [] }),
		supabase
			.from("dm_participants")
			.select("user_id, last_read_at, last_seen_at, profiles(id, display_name, email, avatar_url, is_verified)")
			.eq("conversation_id", id),
	]);
	const profileById = new Map(
		(senderProfiles ?? []).map((profile) => [
			profile.id,
			{
				id: profile.id,
				display_name: profile.display_name?.trim() || profile.email || "Unknown User",
				email: profile.email,
				avatar_url: profile.avatar_url,
				is_verified: Boolean(profile.is_verified),
			},
		]),
	);

	const messages = (data ?? []).map((message) => ({
		id: message.id,
		conversation_id: message.conversation_id,
		sender_id: message.sender_id,
		body_html: sanitizeForRender(message.body_html),
		body_text: message.body_text,
		edited_at: message.edited_at,
		created_at: message.created_at,
		sender: profileById.get(message.sender_id) ?? null,
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
		messages: messages.reverse(),
		participants: (participantRows ?? []).map((entry) => {
			const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
			return {
				user_id: entry.user_id,
				last_read_at: entry.last_read_at,
				last_seen_at: entry.last_seen_at,
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
	});
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { id } = await params;

	const isParticipant = await isConversationParticipant(supabase, id, context.userId);
	if (!isParticipant) {
		return apiError("Conversation not found", 404);
	}

	const rateLimited = await enforceDmRateLimits(supabase, context.userId);
	if (rateLimited) {
		return rateLimited;
	}

	const rawBody = await request.json().catch(() => null);
	const parsed = dmMessageCreateSchema.safeParse(rawBody);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const sanitizedHtml = sanitizeDmBody(parsed.data.body_html ?? "");
	const normalizedText = normalizeDmBodyText(sanitizedHtml);
	const attachmentUrls = parsed.data.attachment_urls ?? [];

	if (normalizedText.length > 0 && !validatePlainTextLength(sanitizedHtml, { min: 1, max: 12000 })) {
		return apiError("Invalid payload", 400, "Message must be between 1 and 12000 plain-text characters.");
	}
	if (normalizedText.length === 0 && attachmentUrls.length === 0) {
		return apiError("Invalid payload", 400, "Message requires text or at least one attachment.");
	}

	if (normalizedText.length > 0 && isSuspiciousForumContent(sanitizedHtml)) {
		return apiError("Message rejected", 400, "Message content appears suspicious.");
	}

	const now = new Date().toISOString();
	const insertPayload = {
		conversation_id: id,
		sender_id: context.userId,
		body_html: sanitizedHtml,
		body_text: normalizedText,
		created_at: now,
	};

	const { data: message, error: messageError } = await supabase
		.from("dm_messages")
		.insert(insertPayload)
		.select("id, conversation_id, sender_id, body_html, body_text, edited_at, created_at")
		.single();
	if (messageError || !message) {
		return apiError("Could not send message", 400, messageError?.message);
	}

	const discoveredImageUrls = Array.from(
		new Set(
			(sanitizedHtml.match(/<img[^>]+src="([^"]+)"/gi) ?? [])
				.map((raw) => {
					const match = raw.match(/src="([^"]+)"/i);
					return match?.[1] ?? "";
				})
				.filter(Boolean),
		),
	);
	const mediaUrls = Array.from(new Set([...attachmentUrls, ...discoveredImageUrls]));

	if (mediaUrls.length > 0) {
		const attachmentsToInsert = mediaUrls.map((url) => {
			const path = parseDmStoragePath(url);
			return {
				message_id: message.id,
				bucket: "dm-media",
				storage_path: path ?? `external-${message.id}-${Math.random().toString(36).slice(2, 8)}`,
				public_url: url,
				mime_type: "image/jpeg",
				size_bytes: 0,
				metadata: {
					external: !path,
				},
			};
		});
		await supabase.from("dm_message_attachments").insert(attachmentsToInsert);
	}

	await Promise.all([
		supabase
			.from("dm_participants")
			.update({
				last_seen_at: now,
				last_read_at: now,
				archived_at: null,
			})
			.eq("conversation_id", id)
			.eq("user_id", context.userId),
		refreshConversationLatestMessage(supabase, id),
	]);

	return apiOk({ message }, 201);
}
