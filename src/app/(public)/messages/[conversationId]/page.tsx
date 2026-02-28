import { notFound, redirect } from "next/navigation";
import { MessageThread } from "@/components/messages/message-thread";
import { getSessionContext } from "@/lib/auth";
import { touchUserPresence } from "@/lib/presence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MessageThreadPageProps {
	params: Promise<{ conversationId: string }>;
}

export default async function MessageThreadPage({ params }: MessageThreadPageProps) {
	const [{ conversationId }, session] = await Promise.all([params, getSessionContext()]);
	if (!session) {
		redirect("/401");
	}
	if (session.status !== "active") {
		redirect("/403");
	}

	const supabase = await createSupabaseServerClient();
	const { data: participant } = await supabase
		.from("dm_participants")
		.select("conversation_id")
		.eq("conversation_id", conversationId)
		.eq("user_id", session.userId)
		.maybeSingle();
	if (!participant) {
		notFound();
	}

	const { data: participantRows } = await supabase
		.from("dm_participants")
		.select("user_id, profiles(display_name, email)")
		.eq("conversation_id", conversationId);
	const counterpart = (participantRows ?? []).find((row) => row.user_id !== session.userId);
	const counterpartProfiles = counterpart?.profiles;
	const counterpartProfile = Array.isArray(counterpartProfiles) ? counterpartProfiles[0] : counterpartProfiles;
	const counterpartName = counterpartProfile?.display_name?.trim() || counterpartProfile?.email || "Conversation";

	await touchUserPresence(session.userId).catch(() => null);

	return (
		<MessageThread
			conversationId={conversationId}
			currentUserId={session.userId}
			initialCounterpartName={counterpartName}
		/>
	);
}
