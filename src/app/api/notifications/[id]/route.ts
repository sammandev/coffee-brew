import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("user_notifications").delete().eq("id", id).eq("recipient_id", session.userId);

	if (error) {
		return apiError("Could not delete notification", 400, error.message);
	}

	return apiOk({ success: true });
}
