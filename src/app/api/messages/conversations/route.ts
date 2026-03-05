import { apiError, apiOk } from "@/lib/api";
import { buildDirectMessageKey } from "@/lib/direct-messages";
import { canCreateDirectConversation, requireActiveDmSession } from "@/lib/dm-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dmConversationListQuerySchema, dmConversationStartSchema } from "@/lib/validators";

function firstParam(value: string | string[] | null) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export async function GET(request: Request) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;

	const url = new URL(request.url);
	const parsed = dmConversationListQuerySchema.safeParse({
		view: firstParam(url.searchParams.getAll("view")) || "active",
		q: firstParam(url.searchParams.getAll("q")) || "",
		limit: firstParam(url.searchParams.getAll("limit")) || "20",
		cursor: firstParam(url.searchParams.getAll("cursor")) || undefined,
	});
	if (!parsed.success) {
		return apiError("Invalid query", 400, parsed.error.message);
	}

	const { view, q, limit, cursor } = parsed.data;
	const searchQuery = (q ?? "").trim().toLowerCase();
	// Over-fetch by 2× to account for JS-side cursor and search filtering.
	// The Supabase JS client does not support filtering on FK-joined columns,
	// so the cursor comparison must remain in JS. 2× is a reasonable bound
	// because most pages will have few cursor-discarded rows.
	const fetchLimit = Math.max(limit * 2, 20);

	const participantsQuery = supabase
		.from("dm_participants")
		.select(
			`
      conversation_id,
      archived_at,
      last_read_at,
      dm_conversations (
        id,
        conversation_type,
        direct_key,
        created_by,
        last_message_id,
        last_message_at,
        created_at,
        updated_at
      )
    `,
		)
		.eq("user_id", context.userId)
		.order("last_message_at", { ascending: false, referencedTable: "dm_conversations" })
		.limit(fetchLimit);

	const scopedParticipantsQuery =
		view === "archived" ? participantsQuery.not("archived_at", "is", null) : participantsQuery.is("archived_at", null);
	const { data: participantRows, error } = await scopedParticipantsQuery;
	if (error) {
		return apiError("Could not fetch conversations", 400, error.message);
	}

	const rows = (participantRows ?? []) as Array<{
		conversation_id: string;
		archived_at: string | null;
		last_read_at: string | null;
		dm_conversations:
			| {
					id: string;
					conversation_type: "direct" | "group";
					direct_key: string | null;
					created_by: string;
					last_message_id: string | null;
					last_message_at: string;
					created_at: string;
					updated_at: string;
			  }
			| Array<{
					id: string;
					conversation_type: "direct" | "group";
					direct_key: string | null;
					created_by: string;
					last_message_id: string | null;
					last_message_at: string;
					created_at: string;
					updated_at: string;
			  }>
			| null;
	}>;

	if (rows.length === 0) {
		return apiOk({ conversations: [], view, unread_count: 0 });
	}

	const conversationIds = rows.map((row) => row.conversation_id);
	const lastMessageIds = rows
		.map((row) => {
			const conversation = Array.isArray(row.dm_conversations) ? row.dm_conversations[0] : row.dm_conversations;
			return conversation?.last_message_id ?? null;
		})
		.filter((id): id is string => Boolean(id));

	const [participantsResult, messagesResult] = await Promise.all([
		supabase
			.from("dm_participants")
			.select("conversation_id, user_id, profiles(id, display_name, email, avatar_url, is_verified)")
			.in("conversation_id", conversationIds),
		lastMessageIds.length > 0
			? supabase
					.from("dm_messages")
					.select("id, conversation_id, sender_id, body_text, created_at")
					.in("id", lastMessageIds)
			: Promise.resolve({
					data: [] as Array<{
						id: string;
						conversation_id: string;
						sender_id: string;
						body_text: string;
						created_at: string;
					}>,
				}),
	]);

	const participantsByConversationId = new Map<
		string,
		Array<{
			id: string;
			display_name: string | null;
			email: string | null;
			avatar_url: string | null;
			is_verified: boolean | null;
		}>
	>();

	for (const row of (participantsResult.data ?? []) as Array<{
		conversation_id: string;
		user_id: string;
		profiles:
			| {
					id: string;
					display_name: string | null;
					email: string | null;
					avatar_url: string | null;
					is_verified: boolean | null;
			  }
			| Array<{
					id: string;
					display_name: string | null;
					email: string | null;
					avatar_url: string | null;
					is_verified: boolean | null;
			  }>
			| null;
	}>) {
		const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
		if (!profile) continue;
		const current = participantsByConversationId.get(row.conversation_id) ?? [];
		current.push(profile);
		participantsByConversationId.set(row.conversation_id, current);
	}

	const messageById = new Map(
		(messagesResult.data ?? []).map((message) => [
			message.id,
			{
				id: message.id,
				sender_id: message.sender_id,
				body_text: message.body_text,
				created_at: message.created_at,
			},
		]),
	);

	// Batch unread counts in one query instead of one COUNT per conversation.
	// We fetch unread message IDs (minimal payload) for all conversations at once,
	// then tally per-conversation in JS. last_read_at varies per row so we use the
	// earliest last_read_at as a conservative lower bound for the WHERE clause —
	// messages older than every last_read_at are definitively read everywhere.
	const unreadCountByConversationId = new Map<string, number>();
	const earliestLastReadAt =
		rows
			.map((row) => row.last_read_at)
			.filter((ts): ts is string => Boolean(ts))
			.sort()
			.at(0) ?? null;

	let unreadQuery = supabase
		.from("dm_messages")
		.select("conversation_id, created_at")
		.in("conversation_id", conversationIds)
		.neq("sender_id", context.userId);
	if (earliestLastReadAt) {
		unreadQuery = unreadQuery.gt("created_at", earliestLastReadAt);
	}
	const { data: unreadMessages } = await unreadQuery;

	// Initialise all to 0 so conversations with no unread messages are included.
	for (const row of rows) {
		unreadCountByConversationId.set(row.conversation_id, 0);
	}
	// Build a per-row last_read_at lookup for the per-conversation filter.
	const lastReadByConversationId = new Map(rows.map((row) => [row.conversation_id, row.last_read_at]));
	for (const message of unreadMessages ?? []) {
		const lastReadAt = lastReadByConversationId.get(message.conversation_id) ?? null;
		if (lastReadAt && message.created_at <= lastReadAt) continue;
		unreadCountByConversationId.set(
			message.conversation_id,
			(unreadCountByConversationId.get(message.conversation_id) ?? 0) + 1,
		);
	}
	const unreadCount = Array.from(unreadCountByConversationId.values()).reduce((total, value) => total + value, 0);

	const filteredConversations = rows
		.map((row) => {
			const conversation = Array.isArray(row.dm_conversations) ? row.dm_conversations[0] : row.dm_conversations;
			if (!conversation) return null;
			if (cursor && new Date(conversation.last_message_at).getTime() >= new Date(cursor).getTime()) {
				return null;
			}
			const participants = participantsByConversationId.get(row.conversation_id) ?? [];
			const counterpart = participants.find((participant) => participant.id !== context.userId) ?? participants[0] ?? null;
			const counterpartName = counterpart?.display_name?.trim() || counterpart?.email || "Unknown User";
			return {
				id: conversation.id,
				conversation_type: conversation.conversation_type,
				direct_key: conversation.direct_key,
				last_message_at: conversation.last_message_at,
				created_at: conversation.created_at,
				updated_at: conversation.updated_at,
				archived_at: row.archived_at,
				last_read_at: row.last_read_at,
				counterpart: counterpart
					? {
							id: counterpart.id,
							display_name: counterpartName,
							email: counterpart.email,
							avatar_url: counterpart.avatar_url,
							is_verified: Boolean(counterpart.is_verified),
						}
					: null,
				participants: participants.map((participant) => ({
					id: participant.id,
					display_name: participant.display_name?.trim() || participant.email || "Unknown User",
					email: participant.email,
					avatar_url: participant.avatar_url,
					is_verified: Boolean(participant.is_verified),
				})),
				last_message: conversation.last_message_id ? (messageById.get(conversation.last_message_id) ?? null) : null,
				unread_count: unreadCountByConversationId.get(row.conversation_id) ?? 0,
				unread_hint: (unreadCountByConversationId.get(row.conversation_id) ?? 0) > 0,
			};
		})
		.filter(
			(value): value is NonNullable<typeof value> =>
				Boolean(value) &&
				(searchQuery.length === 0 ||
					`${value?.counterpart?.display_name ?? ""} ${value?.last_message?.body_text ?? ""}`
						.toLowerCase()
						.includes(searchQuery)),
		);

	const conversations = filteredConversations.slice(0, limit);
	const hasMore = filteredConversations.length > conversations.length;
	const nextCursor = hasMore ? (conversations.at(-1)?.last_message_at ?? null) : null;

	return apiOk({
		conversations,
		view,
		unread_count: unreadCount,
		has_more: hasMore,
		next_cursor: nextCursor,
	});
}

export async function POST(request: Request) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const supabaseAdmin = createSupabaseAdminClient();

	const body = await request.json().catch(() => null);
	const parsed = dmConversationStartSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const recipientId = parsed.data.recipientId;
	if (recipientId === context.userId) {
		return apiError("Could not start conversation", 400, "Cannot create direct message with yourself.");
	}

	const { data: recipient } = await supabaseAdmin
		.from("profiles")
		.select("id, status")
		.eq("id", recipientId)
		.maybeSingle<{ id: string; status: string }>();
	if (!recipient) {
		return apiError("Recipient not found", 404);
	}
	if (recipient.status !== "active") {
		return apiError("Could not start conversation", 403, "Recipient is not available.");
	}

	const allowed = await canCreateDirectConversation(supabase, context.userId, recipientId);
	if (!allowed) {
		return apiError("Could not start conversation", 403, "Recipient does not accept direct messages from this account.");
	}

	const directKey = buildDirectMessageKey(context.userId, recipientId);

	const { data: existingConversation } = await supabaseAdmin
		.from("dm_conversations")
		.select("id")
		.eq("conversation_type", "direct")
		.eq("direct_key", directKey)
		.maybeSingle<{ id: string }>();

	if (existingConversation) {
		// Only un-archive the initiator's own row. Never touch the recipient's
		// participant row — they may have intentionally archived this conversation.
		await supabaseAdmin.from("dm_participants").upsert(
			[
				{
					conversation_id: existingConversation.id,
					user_id: context.userId,
					archived_at: null,
					last_seen_at: new Date().toISOString(),
				},
			],
			{ onConflict: "conversation_id,user_id" },
		);
		return apiOk({ conversation_id: existingConversation.id, created: false });
	}

	const { data: createdConversation, error: conversationError } = await supabaseAdmin
		.from("dm_conversations")
		.insert({
			conversation_type: "direct",
			direct_key: directKey,
			created_by: context.userId,
			last_message_at: new Date().toISOString(),
		})
		.select("id")
		.single<{ id: string }>();

	if (conversationError || !createdConversation) {
		return apiError("Could not start conversation", 400, conversationError?.message);
	}

	const { error: participantError } = await supabaseAdmin.from("dm_participants").insert([
		{
			conversation_id: createdConversation.id,
			user_id: context.userId,
			last_seen_at: new Date().toISOString(),
		},
		{
			conversation_id: createdConversation.id,
			user_id: recipientId,
		},
	]);
	if (participantError) {
		return apiError("Could not start conversation", 400, participantError.message);
	}

	return apiOk({ conversation_id: createdConversation.id, created: true }, 201);
}
