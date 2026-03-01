import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { touchUserPresence } from "@/lib/presence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MessageThreadRedirectPageProps {
	params: Promise<{ conversationId: string }>;
}

export default async function MessageThreadRedirectPage({ params }: MessageThreadRedirectPageProps) {
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

	await touchUserPresence(session.userId).catch(() => null);
	redirect(`/messages?c=${encodeURIComponent(conversationId)}`);
}
