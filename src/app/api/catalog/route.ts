import { apiError, apiOk } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const query = url.searchParams.get("q")?.trim();
	const method = url.searchParams.get("method")?.trim();
	const roastery = url.searchParams.get("roastery")?.trim();

	const supabase = await createSupabaseServerClient();

	let chain = supabase
		.from("brews")
		.select("id, name, brew_method, coffee_beans, brand_roastery, brewer_name, created_at, temperature, water_ppm")
		.eq("status", "published")
		.order("created_at", { ascending: false });

	if (query) {
		chain = chain.or(`name.ilike.%${query}%,coffee_beans.ilike.%${query}%,brand_roastery.ilike.%${query}%`);
	}

	if (method) {
		chain = chain.ilike("brew_method", `%${method}%`);
	}

	if (roastery) {
		chain = chain.ilike("brand_roastery", `%${roastery}%`);
	}

	const { data, error } = await chain.limit(100);

	if (error) {
		return apiError("Could not load catalog", 400, error.message);
	}

	return apiOk({ items: data });
}
