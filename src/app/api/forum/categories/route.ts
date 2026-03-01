import { createClient } from "@supabase/supabase-js";
import { apiError, apiOk } from "@/lib/api";
import { clientEnv } from "@/lib/config/client";

export const runtime = "edge";

export async function GET() {
	const supabase = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});
	const { data, error } = await supabase
		.from("forum_categories")
		.select("id, slug, name_en, name_id, description_en, description_id, order_index, is_visible")
		.eq("is_visible", true)
		.order("order_index", { ascending: true });

	if (error) {
		return apiError("Could not load forum categories", 400, error.message);
	}

	return apiOk({ categories: data ?? [] });
}
