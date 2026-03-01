import { redirect } from "next/navigation";
import { MessagesWorkspace } from "@/components/messages/messages-workspace";
import { getSessionContext } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";
import { touchUserPresence } from "@/lib/presence";

interface MessagesPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
	const [session, { locale }, params] = await Promise.all([getSessionContext(), getServerI18n(), searchParams]);
	if (!session) {
		redirect("/401");
	}
	if (session.status !== "active") {
		redirect("/403");
	}

	await touchUserPresence(session.userId).catch(() => null);

	const initialConversationId = firstParam(params.c).trim() || null;
	const initialView = firstParam(params.view).trim() === "archived" ? "archived" : "active";
	const initialQuery = firstParam(params.q).trim();

	return (
		<MessagesWorkspace
			currentUserId={session.userId}
			initialConversationId={initialConversationId}
			initialQuery={initialQuery}
			initialView={initialView}
			locale={locale}
		/>
	);
}
