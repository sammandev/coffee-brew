import { sortCatalogRows } from "@/lib/brew-catalog";
import { FORUM_REACTION_TYPES, type ForumReactionType } from "@/lib/constants";
import { aggregateRatings } from "@/lib/rating";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase-errors";

const BREW_OPTIONAL_COLUMNS = [
	"image_url",
	"image_alt",
	"tags",
	"bean_process",
	"recommended_methods",
	"grind_reference_image_url",
	"grind_reference_image_alt",
] as const;

export async function getVisibleLandingSections() {
	const supabase = await createSupabaseServerClient();
	let { data, error } = await supabase
		.from("landing_sections")
		.select("*")
		.eq("status", "published")
		.order("order_index", { ascending: true });

	if (error && isMissingColumnError(error, ["status"])) {
		const fallback = await supabase
			.from("landing_sections")
			.select("*")
			.eq("is_visible", true)
			.order("order_index", { ascending: true });
		data = fallback.data;
	}

	return data ?? [];
}

export async function getVisibleFaqItems() {
	const supabase = await createSupabaseServerClient();
	let { data, error } = await supabase
		.from("faq_items")
		.select("*")
		.eq("status", "published")
		.order("order_index", { ascending: true });

	if (error && isMissingColumnError(error, ["status"])) {
		const fallback = await supabase
			.from("faq_items")
			.select("*")
			.eq("is_visible", true)
			.order("order_index", { ascending: true });
		data = fallback.data;
	}

	return data ?? [];
}

export async function getPublishedBrews(limit = 24) {
	const supabase = await createSupabaseServerClient();
	let { data, error } = await supabase
		.from("brews")
		.select(
			"id, name, brew_method, bean_process, brand_roastery, coffee_beans, brewer_name, image_url, image_alt, grind_reference_image_url, grind_reference_image_alt, recommended_methods, tags, created_at",
		)
		.eq("status", "published")
		.order("created_at", { ascending: false })
		.limit(limit);

	if (error && isMissingColumnError(error, [...BREW_OPTIONAL_COLUMNS])) {
		console.warn("[queries:getPublishedBrews] optional brew columns missing; retrying with compatibility query");
		const fallback = await supabase
			.from("brews")
			.select("id, name, brew_method, brand_roastery, coffee_beans, brewer_name, created_at")
			.eq("status", "published")
			.order("created_at", { ascending: false })
			.limit(limit);
		data = (fallback.data ?? []).map((brew) => ({
			...brew,
			image_url: null,
			image_alt: null,
			grind_reference_image_url: null,
			grind_reference_image_alt: null,
			bean_process: null,
			recommended_methods: [],
			tags: [],
		}));
		error = fallback.error ?? null;
	}

	if (error) {
		return [];
	}

	return data ?? [];
}

export async function getLandingStats() {
	const supabase = await createSupabaseServerClient();

	const [{ count: publishedBrews }, { count: forumThreads }, { count: reviewEntries }, { data: roasteryCount }] =
		await Promise.all([
			supabase.from("brews").select("*", { count: "exact", head: true }).eq("status", "published"),
			supabase.from("forum_threads").select("*", { count: "exact", head: true }).eq("status", "visible"),
			supabase.from("brew_reviews").select("*", { count: "exact", head: true }),
			supabase.rpc("count_distinct_roasteries"),
		]);

	return {
		publishedBrews: publishedBrews ?? 0,
		forumThreads: forumThreads ?? 0,
		reviewEntries: reviewEntries ?? 0,
		roasteries: Number(roasteryCount) || 0,
	};
}

export async function getHomeShowcase(limitFeaturedBrews = 6, limitTopRatedBrews = 5) {
	const supabase = await createSupabaseServerClient();

	const { data: brewRows, error: brewError } = await supabase
		.from("brews")
		.select(
			"id, name, brew_method, bean_process, brand_roastery, coffee_beans, brewer_name, image_url, image_alt, grind_reference_image_url, grind_reference_image_alt, recommended_methods, tags, created_at",
		)
		.eq("status", "published")
		.order("created_at", { ascending: false })
		.limit(220);
	let brews = brewRows ?? [];

	if (brewError && isMissingColumnError(brewError, [...BREW_OPTIONAL_COLUMNS])) {
		console.warn("[queries:getHomeShowcase] optional brew columns missing; retrying with compatibility query");
		const fallback = await supabase
			.from("brews")
			.select("id, name, brew_method, brand_roastery, coffee_beans, brewer_name, created_at")
			.eq("status", "published")
			.order("created_at", { ascending: false })
			.limit(220);
		brews = (fallback.data ?? []).map((brew) => ({
			...brew,
			image_url: null,
			image_alt: null,
			grind_reference_image_url: null,
			grind_reference_image_alt: null,
			bean_process: null,
			recommended_methods: [],
			tags: [],
		}));
	}

	const brewIds = brews.map((brew) => brew.id);
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

	const preparedBrews = brews.map((brew) => {
		const aggregate = aggregateMap.get(brew.id);
		return {
			...brew,
			review_total: aggregate?.total ?? 0,
			rating_avg: aggregate && aggregate.total > 0 ? aggregate.score / aggregate.total : 0,
		};
	});

	const featuredBrews = sortCatalogRows(preparedBrews, "newest").slice(0, limitFeaturedBrews);
	const topRatedBrews = sortCatalogRows(preparedBrews, "highest_stars").slice(0, limitTopRatedBrews);

	return {
		featuredBrews,
		topRatedBrews,
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

function buildReactionCountMap(
	rows: Array<{ post_id: string; reaction: ForumReactionType }> | Array<{ reaction: ForumReactionType }>,
) {
	const counts = Object.fromEntries(FORUM_REACTION_TYPES.map((reactionType) => [reactionType, 0])) as Record<
		ForumReactionType,
		number
	>;
	for (const row of rows) {
		if (!FORUM_REACTION_TYPES.includes(row.reaction as ForumReactionType)) continue;
		const reactionType = row.reaction as ForumReactionType;
		counts[reactionType] = (counts[reactionType] ?? 0) + 1;
	}
	return counts;
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
	const postIds = data.map((post) => post.id);
	const { data: reactionRows, error: reactionRowsError } =
		postIds.length > 0
			? await supabase.from("blog_reactions").select("post_id, reaction").in("post_id", postIds)
			: { data: [] as Array<{ post_id: string; reaction: ForumReactionType }> };
	const safeReactionRows = reactionRowsError ? [] : (reactionRows ?? []);
	const reactionRowsByPostId = new Map<string, Array<{ reaction: ForumReactionType }>>();
	for (const row of safeReactionRows) {
		const current = reactionRowsByPostId.get(row.post_id) ?? [];
		current.push({ reaction: row.reaction as ForumReactionType });
		reactionRowsByPostId.set(row.post_id, current);
	}

	return data.map((post) => ({
		...post,
		author_name: post.author_id ? (nameMap.get(post.author_id) ?? "Unknown author") : "System",
		editor_name: post.editor_id ? (nameMap.get(post.editor_id) ?? "Unknown editor") : null,
		reaction_counts: buildReactionCountMap(reactionRowsByPostId.get(post.id) ?? []),
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
	const { data: reactionRows, error: reactionRowsError } = await supabase
		.from("blog_reactions")
		.select("reaction")
		.eq("post_id", data.id);

	return {
		...data,
		author_name: data.author_id ? (nameMap.get(data.author_id) ?? "Unknown author") : "System",
		editor_name: data.editor_id ? (nameMap.get(data.editor_id) ?? "Unknown editor") : null,
		reaction_counts: buildReactionCountMap(
			(reactionRowsError ? [] : (reactionRows ?? [])).map((row) => ({ reaction: row.reaction as ForumReactionType })),
		),
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
