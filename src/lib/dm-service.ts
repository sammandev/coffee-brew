import { apiError } from "@/lib/api";
import { getSessionContext, type SessionContext } from "@/lib/auth";
import { buildDirectMessageKey } from "@/lib/direct-messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireActiveDmSession(): Promise<
	| {
			context: SessionContext;
			supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
	  }
	| { response: Response }
> {
	const context = await getSessionContext();
	if (!context) {
		return { response: apiError("Unauthorized", 401) };
	}
	if (context.status !== "active") {
		return { response: apiError("Account blocked or disabled", 403) };
	}
	const supabase = await createSupabaseServerClient();
	return { context, supabase };
}

export async function isConversationParticipant(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	conversationId: string,
	userId: string,
) {
	const { data } = await supabase
		.from("dm_participants")
		.select("conversation_id")
		.eq("conversation_id", conversationId)
		.eq("user_id", userId)
		.maybeSingle();
	return Boolean(data);
}

export async function canCreateDirectConversation(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	senderId: string,
	recipientId: string,
) {
	const { data } = await supabase.rpc("can_start_dm", {
		sender_id: senderId,
		recipient_id: recipientId,
	});
	return Boolean(data);
}

export function resolveDirectKey(userA: string, userB: string) {
	return buildDirectMessageKey(userA, userB);
}

export async function enforceDmRateLimits(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	userId: string,
) {
	const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const [{ count: recentMessages }, { count: dailyConversations }] = await Promise.all([
		supabase
			.from("dm_messages")
			.select("id", { count: "exact", head: true })
			.eq("sender_id", userId)
			.gte("created_at", oneMinuteAgo),
		supabase
			.from("dm_conversations")
			.select("id", { count: "exact", head: true })
			.eq("created_by", userId)
			.gte("created_at", oneDayAgo),
	]);

	if ((recentMessages ?? 0) >= 20) {
		return apiError("Rate limit exceeded", 429, "You are sending messages too quickly. Try again shortly.");
	}
	if ((dailyConversations ?? 0) >= 200) {
		return apiError("Rate limit exceeded", 429, "Daily conversation start limit reached.");
	}
	return null;
}

export async function refreshConversationLatestMessage(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	conversationId: string,
) {
	const { data: latest } = await supabase
		.from("dm_messages")
		.select("id, created_at")
		.eq("conversation_id", conversationId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	await supabase
		.from("dm_conversations")
		.update({
			last_message_id: latest?.id ?? null,
			last_message_at: latest?.created_at ?? new Date().toISOString(),
		})
		.eq("id", conversationId);
}
