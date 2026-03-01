import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
	const session = await getSessionContext();
	if (!session) return apiError("Unauthorized", 401);
	if (session.status !== "active") return apiError("Account blocked or disabled", 403);

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("brew_collection_shares")
		.select("id, owner_id, token, is_active, created_at, updated_at")
		.eq("owner_id", session.userId)
		.maybeSingle();

	if (error) {
		return apiError("Could not load collection share", 400, error.message);
	}

	return apiOk({ share: data ?? null });
}
