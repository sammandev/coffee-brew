import { createClient } from "@supabase/supabase-js";
import { apiError, apiOk } from "@/lib/api";
import { clientEnv } from "@/lib/config/client";

export const runtime = "edge";

export async function GET(request: Request) {
	const supabase = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});
	const url = new URL(request.url);
	const category = url.searchParams.get("category")?.trim();

	let query = supabase
		.from("forum_subforums")
		.select("id, category_id, slug, name_en, name_id, description_en, description_id, order_index, is_visible")
		.eq("is_visible", true)
		.order("order_index", { ascending: true });

	if (category) {
		query = query.eq("category_id", category);
	}

	const { data, error } = await query;
	if (error) {
		return apiError("Could not load forum sub-forums", 400, error.message);
	}

	return apiOk({ subforums: data ?? [] });
}
