import { apiError, apiOk } from "@/lib/api";
import { isConversationParticipant, requireActiveDmSession } from "@/lib/dm-service";
import { dmReportCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;

	const body = await request.json().catch(() => null);
	const parsed = dmReportCreateSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const { conversationId, messageId, reason, detail } = parsed.data;
	const isParticipant = await isConversationParticipant(supabase, conversationId, context.userId);
	if (!isParticipant) {
		return apiError("Conversation not found", 404);
	}

	const { data: message } = await supabase
		.from("dm_messages")
		.select("id, conversation_id")
		.eq("id", messageId)
		.eq("conversation_id", conversationId)
		.maybeSingle();
	if (!message) {
		return apiError("Message not found", 404);
	}

	const { data: existingReport } = await supabase
		.from("dm_reports")
		.select("id, status")
		.eq("reporter_id", context.userId)
		.eq("conversation_id", conversationId)
		.eq("message_id", messageId)
		.in("status", ["open", "resolved"])
		.maybeSingle();
	if (existingReport) {
		return apiOk({ report_id: existingReport.id, status: existingReport.status });
	}

	const { data: report, error } = await supabase
		.from("dm_reports")
		.insert({
			reporter_id: context.userId,
			conversation_id: conversationId,
			message_id: messageId,
			reason,
			detail: detail ?? null,
			status: "open",
		})
		.select("id, status, created_at")
		.single();
	if (error || !report) {
		return apiError("Could not submit report", 400, error?.message);
	}

	return apiOk({ report }, 201);
}
