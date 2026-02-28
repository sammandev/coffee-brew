import { apiError, apiOk } from "@/lib/api";
import { requireActiveDmSession } from "@/lib/dm-service";

export async function GET() {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;

	const { data, error } = await supabase
		.from("user_blocks")
		.select("blocked_id, created_at")
		.eq("blocker_id", context.userId)
		.order("created_at", { ascending: false });
	if (error) {
		return apiError("Could not fetch blocked users", 400, error.message);
	}

	const blockedIds = (data ?? []).map((entry) => entry.blocked_id);
	const { data: profiles } =
		blockedIds.length > 0
			? await supabase
					.from("profiles")
					.select("id, display_name, email, avatar_url, mention_handle, is_verified")
					.in("id", blockedIds)
			: { data: [] };
	const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

	const blockedUsers = (data ?? []).map((entry) => {
		const profile = profileById.get(entry.blocked_id) ?? null;
		return {
			id: entry.blocked_id,
			created_at: entry.created_at,
			profile: profile
				? {
						id: profile.id,
						display_name: profile.display_name?.trim() || profile.email || "Unknown User",
						email: profile.email,
						avatar_url: profile.avatar_url,
						mention_handle: profile.mention_handle,
						is_verified: Boolean(profile.is_verified),
					}
				: null,
		};
	});

	return apiOk({ blocked_users: blockedUsers });
}
