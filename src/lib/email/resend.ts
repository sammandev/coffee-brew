import { Resend } from "resend";
import { serverEnv } from "@/lib/config/server";

export interface TransactionalEmailPayload {
	to: string;
	subject: string;
	html: string;
	eventType: "welcome" | "role_change" | "account_status" | "forum_reply";
}

export async function sendTransactionalEmail(payload: TransactionalEmailPayload) {
	if (!serverEnv.RESEND_API_KEY || !serverEnv.RESEND_FROM_EMAIL) {
		return {
			delivered: false,
			providerId: null,
			reason: "Resend env vars missing",
		};
	}

	const resend = new Resend(serverEnv.RESEND_API_KEY);

	const { data, error } = await resend.emails.send({
		from: serverEnv.RESEND_FROM_EMAIL,
		to: payload.to,
		subject: payload.subject,
		html: payload.html,
	});

	if (error) {
		return {
			delivered: false,
			providerId: null,
			reason: error.message,
		};
	}

	return {
		delivered: true,
		providerId: data?.id ?? null,
		reason: null,
	};
}
