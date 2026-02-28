import { aggregateRatings } from "@/lib/rating";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getVisibleLandingSections() {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase
		.from("landing_sections")
		.select("*")
		.eq("is_visible", true)
		.order("order_index", { ascending: true });
	return data ?? [];
}

export async function getVisibleFaqItems() {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase
		.from("faq_items")
		.select("*")
		.eq("is_visible", true)
		.order("order_index", { ascending: true });
	return data ?? [];
}

export async function getPublishedBrews(limit = 24) {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase
		.from("brews")
		.select("id, name, brew_method, brand_roastery, coffee_beans, brewer_name, created_at")
		.eq("status", "published")
		.order("created_at", { ascending: false })
		.limit(limit);
	return data ?? [];
}

export async function getForumThreads(limit = 50) {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase
		.from("forum_threads")
		.select("id, title, content, author_id, created_at, updated_at")
		.eq("status", "visible")
		.order("updated_at", { ascending: false })
		.limit(limit);
	return data ?? [];
}

export async function getBrewDetail(id: string) {
	const supabase = await createSupabaseServerClient();
	const [{ data: brew }, { data: reviews }] = await Promise.all([
		supabase.from("brews").select("*").eq("id", id).single(),
		supabase
			.from("brew_reviews")
			.select("acidity, sweetness, body, aroma, balance, notes, reviewer_id, updated_at")
			.eq("brew_id", id),
	]);

	return {
		brew,
		reviews: reviews ?? [],
		aggregate: aggregateRatings(reviews ?? []),
	};
}
