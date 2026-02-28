import { apiError, apiOk } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumMentionSearchSchema } from "@/lib/validators";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const parsed = forumMentionSearchSchema.safeParse({
		q: url.searchParams.get("q") ?? "",
		limit: url.searchParams.get("limit") ?? undefined,
	});
	if (!parsed.success) {
		return apiError("Invalid mention query", 400, parsed.error.message);
	}

	const q = parsed.data.q.trim().toLowerCase();
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("profiles")
		.select("id, mention_handle, display_name, email, is_profile_private")
		.or(`mention_handle.ilike.%${q}%,display_name.ilike.%${q}%`)
		.limit(parsed.data.limit);

	if (error) {
		return apiError("Could not load mention candidates", 400, error.message);
	}

	return apiOk({
		users: (data ?? []).map((profile) => ({
			id: profile.id,
			mention_handle: profile.mention_handle,
			display_name: profile.display_name,
			email: profile.email,
		})),
	});
}
