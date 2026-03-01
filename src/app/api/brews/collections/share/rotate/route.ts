import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { generateCollectionShareToken } from "@/lib/brew-collections";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
	const session = await getSessionContext();
	if (!session) return apiError("Unauthorized", 401);
	if (session.status !== "active") return apiError("Account blocked or disabled", 403);

	const supabase = await createSupabaseServerClient();
	const token = generateCollectionShareToken();
	const { data, error } = await supabase
		.from("brew_collection_shares")
		.upsert(
			{
				owner_id: session.userId,
				token,
				is_active: true,
			},
			{ onConflict: "owner_id" },
		)
		.select("id, owner_id, token, is_active, created_at, updated_at")
		.single();

	if (error) {
		return apiError("Could not rotate share token", 400, error.message);
	}

	return apiOk({ share: data });
}
