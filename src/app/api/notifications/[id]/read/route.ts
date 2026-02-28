import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from("user_notifications")
		.update({ read_at: now })
		.eq("id", id)
		.eq("recipient_id", session.userId)
		.is("read_at", null)
		.select("id, read_at")
		.maybeSingle();

	if (error) {
		return apiError("Could not mark notification as read", 400, error.message);
	}

	return apiOk({
		success: true,
		notification: data,
	});
}
