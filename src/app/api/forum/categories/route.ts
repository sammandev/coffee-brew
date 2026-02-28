import { apiError, apiOk } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
	const supabase = await createSupabaseServerClient();
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
