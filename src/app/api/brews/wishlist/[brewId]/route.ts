import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_: Request, { params }: { params: Promise<{ brewId: string }> }) {
	const session = await getSessionContext();
	if (!session) return apiError("Unauthorized", 401);
	if (session.status !== "active") return apiError("Account blocked or disabled", 403);

	const { brewId } = await params;
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("brew_wishlist").delete().eq("user_id", session.userId).eq("brew_id", brewId);

	if (error) {
		return apiError("Could not update wishlist", 400, error.message);
	}

	return apiOk({ success: true });
}
