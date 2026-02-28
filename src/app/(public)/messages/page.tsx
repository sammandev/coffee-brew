import { redirect } from "next/navigation";
import { MessagesInbox } from "@/components/messages/messages-inbox";
import { getSessionContext } from "@/lib/auth";
import { getServerI18n } from "@/lib/i18n/server";
import { touchUserPresence } from "@/lib/presence";

export default async function MessagesInboxPage() {
	const [session, { locale }] = await Promise.all([getSessionContext(), getServerI18n()]);
	if (!session) {
		redirect("/401");
	}
	if (session.status !== "active") {
		redirect("/403");
	}

	await touchUserPresence(session.userId).catch(() => null);
	return <MessagesInbox locale={locale} />;
}
