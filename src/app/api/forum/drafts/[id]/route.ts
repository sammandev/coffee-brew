import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("forum_drafts").delete().eq("id", id).eq("user_id", session.userId);
	if (error) {
		return apiError("Could not delete draft", 400, error.message);
	}

	return apiOk({ success: true });
}
