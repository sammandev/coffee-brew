import { apiError, apiOk } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase-errors";

const BREW_OPTIONAL_COLUMNS = ["image_url", "image_alt", "tags"] as const;

export async function GET(request: Request) {
	const url = new URL(request.url);
	const query = url.searchParams.get("q")?.trim();
	const method = url.searchParams.get("method")?.trim();
	const roastery = url.searchParams.get("roastery")?.trim();

	const supabase = await createSupabaseServerClient();

	function buildCatalogQuery(withImageFields: boolean) {
		let chain = supabase
			.from("brews")
			.select(
				withImageFields
					? "id, name, brew_method, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, tags, created_at, temperature, water_ppm"
					: "id, name, brew_method, coffee_beans, brand_roastery, brewer_name, created_at, temperature, water_ppm",
			)
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

		return chain.limit(100);
	}

	const primary = await buildCatalogQuery(true);

	if (primary.error && isMissingColumnError(primary.error, [...BREW_OPTIONAL_COLUMNS])) {
		console.warn("[catalog] optional brew columns missing; retrying with compatibility query");
		const fallback = await buildCatalogQuery(false);
		if (fallback.error) {
			return apiError("Could not load catalog", 400, fallback.error.message);
		}
		return apiOk({
			items: (fallback.data ?? []).map((item) => {
				const base = typeof item === "object" && item !== null ? item : {};
				return {
					...base,
					image_url: null,
					image_alt: null,
					tags: [],
				};
			}),
		});
	}

	if (primary.error) {
		return apiError("Could not load catalog", 400, primary.error.message);
	}

	return apiOk({ items: primary.data });
}
