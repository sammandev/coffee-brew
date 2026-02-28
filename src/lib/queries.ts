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
		.select("id, name, brew_method, brand_roastery, coffee_beans, brewer_name, image_url, image_alt, created_at")
		.eq("status", "published")
		.order("created_at", { ascending: false })
		.limit(limit);
	return data ?? [];
}

export async function getLandingStats() {
	const supabase = await createSupabaseServerClient();

	const [{ count: publishedBrews }, { count: forumThreads }, { count: reviewEntries }, { data: roasteryRows }] =
		await Promise.all([
			supabase.from("brews").select("*", { count: "exact", head: true }).eq("status", "published"),
			supabase.from("forum_threads").select("*", { count: "exact", head: true }).eq("status", "visible"),
			supabase.from("brew_reviews").select("*", { count: "exact", head: true }),
			supabase.from("brews").select("brand_roastery").eq("status", "published").limit(2000),
		]);

	const roasteries = new Set(
		(roasteryRows ?? [])
			.map((row) => row.brand_roastery)
			.filter((value): value is string => typeof value === "string" && value.trim().length > 0),
	);

	return {
		publishedBrews: publishedBrews ?? 0,
		forumThreads: forumThreads ?? 0,
		reviewEntries: reviewEntries ?? 0,
		roasteries: roasteries.size,
	};
}

export async function getHomeShowcase(limitBrews = 6, limitReviews = 6) {
	const supabase = await createSupabaseServerClient();

	const [{ data: brews }, { data: recentReviews }] = await Promise.all([
		supabase
			.from("brews")
			.select("id, name, brew_method, brand_roastery, coffee_beans, brewer_name, image_url, image_alt, created_at")
			.eq("status", "published")
			.order("created_at", { ascending: false })
			.limit(limitBrews),
		supabase
			.from("brew_reviews")
			.select("id, brew_id, overall, notes, updated_at, brews(name)")
			.order("updated_at", { ascending: false })
			.limit(limitReviews),
	]);

	const brewIds = (brews ?? []).map((brew) => brew.id);
	const { data: reviewAggregates } =
		brewIds.length > 0
			? await supabase.from("brew_reviews").select("brew_id, overall").in("brew_id", brewIds)
			: { data: [] as Array<{ brew_id: string; overall: number }> };

	const aggregateMap = new Map<string, { total: number; score: number }>();
	for (const row of reviewAggregates ?? []) {
		const existing = aggregateMap.get(row.brew_id) ?? { total: 0, score: 0 };
		existing.total += 1;
		existing.score += Number(row.overall);
		aggregateMap.set(row.brew_id, existing);
	}

	const featuredBrews = (brews ?? []).map((brew) => {
		const aggregate = aggregateMap.get(brew.id);
		return {
			...brew,
			review_total: aggregate?.total ?? 0,
			rating_avg: aggregate && aggregate.total > 0 ? aggregate.score / aggregate.total : 0,
		};
	});

	const mappedReviews = (recentReviews ?? []).map((review) => ({
		id: review.id,
		brew_id: review.brew_id,
		overall: Number(review.overall),
		notes: review.notes,
		updated_at: review.updated_at,
		brew_name: Array.isArray(review.brews)
			? (review.brews[0]?.name ?? "Unknown Brew")
			: ((review.brews as { name?: string } | null)?.name ?? "Unknown Brew"),
	}));

	return {
		featuredBrews,
		recentReviews: mappedReviews,
	};
}

export async function getForumThreads(limit = 50) {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase
		.from("forum_threads")
		.select("id, title, content, tags, author_id, created_at, updated_at")
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

async function getProfileNameMap(profileIds: string[]) {
	if (profileIds.length === 0) {
		return new Map<string, string>();
	}

	const supabase = await createSupabaseServerClient();
	const { data } = await supabase.from("profiles").select("id, display_name, email").in("id", profileIds);

	return new Map((data ?? []).map((profile) => [profile.id, profile.display_name || profile.email || "Unknown author"]));
}

export async function getPublishedBlogPosts(limit = 24) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("blog_posts")
		.select(
			"id, slug, title_en, title_id, excerpt_en, excerpt_id, hero_image_url, hero_image_alt_en, hero_image_alt_id, tags, reading_time_minutes, published_at, updated_at, author_id, editor_id",
		)
		.eq("status", "published")
		.order("published_at", { ascending: false })
		.limit(limit);

	if (error || !data) {
		return [];
	}

	const profileIds = Array.from(
		new Set(
			data
				.flatMap((post) => [post.author_id, post.editor_id])
				.filter((id): id is string => typeof id === "string" && id.length > 0),
		),
	);

	const nameMap = await getProfileNameMap(profileIds);

	return data.map((post) => ({
		...post,
		author_name: post.author_id ? (nameMap.get(post.author_id) ?? "Unknown author") : "System",
		editor_name: post.editor_id ? (nameMap.get(post.editor_id) ?? "Unknown editor") : null,
	}));
}

export async function getPublishedBlogPostBySlug(slug: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("blog_posts")
		.select("*")
		.eq("slug", slug)
		.eq("status", "published")
		.maybeSingle();

	if (error || !data) {
		return null;
	}

	const profileIds = [data.author_id, data.editor_id].filter(
		(id): id is string => typeof id === "string" && id.length > 0,
	);
	const nameMap = await getProfileNameMap(profileIds);

	return {
		...data,
		author_name: data.author_id ? (nameMap.get(data.author_id) ?? "Unknown author") : "System",
		editor_name: data.editor_id ? (nameMap.get(data.editor_id) ?? "Unknown editor") : null,
	};
}

export async function getAdminBlogPosts(limit = 120) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("blog_posts")
		.select(
			"id, slug, title_en, title_id, status, tags, reading_time_minutes, published_at, updated_at, author_id, editor_id",
		)
		.order("updated_at", { ascending: false })
		.limit(limit);

	if (error || !data) {
		return [];
	}

	const profileIds = Array.from(
		new Set(
			data
				.flatMap((post) => [post.author_id, post.editor_id])
				.filter((id): id is string => typeof id === "string" && id.length > 0),
		),
	);
	const nameMap = await getProfileNameMap(profileIds);

	return data.map((post) => ({
		...post,
		author_name: post.author_id ? (nameMap.get(post.author_id) ?? "Unknown author") : "System",
		editor_name: post.editor_id ? (nameMap.get(post.editor_id) ?? "Unknown editor") : null,
	}));
}

export async function getAdminBlogPostById(id: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();

	if (error || !data) {
		return null;
	}

	return data;
}
