import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const supabase = await createSupabaseServerClient();
	const now = new Date().toISOString();
	const { error } = await supabase
		.from("user_notifications")
		.update({ read_at: now })
		.eq("recipient_id", session.userId)
		.is("archived_at", null)
		.is("read_at", null);

	if (error) {
		return apiError("Could not mark notifications as read", 400, error.message);
	}

	return apiOk({ success: true });
}
