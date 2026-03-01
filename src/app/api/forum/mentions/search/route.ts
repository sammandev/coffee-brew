import { createClient } from "@supabase/supabase-js";
import { apiError, apiOk } from "@/lib/api";
import { clientEnv } from "@/lib/config/client";
import { forumMentionSearchSchema } from "@/lib/validators";

export const runtime = "edge";

function escapeLikePattern(value: string) {
	return value.replace(/[%_\\]/g, "\\$&");
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const parsed = forumMentionSearchSchema.safeParse({
		q: url.searchParams.get("q") ?? "",
		limit: url.searchParams.get("limit") ?? undefined,
	});
	if (!parsed.success) {
		return apiError("Invalid mention query", 400, parsed.error.message);
	}

	const q = escapeLikePattern(parsed.data.q.trim().toLowerCase());
	const supabase = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});
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
