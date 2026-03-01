import Image from "next/image";
import Link from "next/link";
import { BlogSearchControls } from "@/components/blog/blog-search-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { FORUM_REACTION_TYPES, type ForumReactionType, REACTION_EMOJI } from "@/lib/constants";
import { BLOG_POSTS, localizeBlogText } from "@/lib/content/blog";
import { getServerI18n } from "@/lib/i18n/server";
import { clampPlainText } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

interface BlogPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const BLOG_PER_PAGE = 12;

function getFirstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

function emptyReactionCounts() {
	return Object.fromEntries(FORUM_REACTION_TYPES.map((reactionType) => [reactionType, 0])) as Record<
		ForumReactionType,
		number
	>;
}

function buildBlogHref(page: number, params: Record<string, string>) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		const trimmed = value.trim();
		if (trimmed.length > 0) query.set(key, trimmed);
	}
	query.set("page", String(page));
	return `/blog?${query.toString()}`;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
	const [{ locale, t }, params] = await Promise.all([getServerI18n(), searchParams]);
	const supabase = await createSupabaseServerClient();
	const q = getFirstParam(params.q).trim().toLowerCase();
	const tag = getFirstParam(params.tag).trim().toLowerCase();
	const author = getFirstParam(params.author).trim().toLowerCase();
	const minReadParam = getFirstParam(params.minRead).trim();
	const sortParam = getFirstParam(params.sort).trim();
	const pageParam = Number(getFirstParam(params.page));
	const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
	const minRead = Number.isFinite(Number(minReadParam)) ? Math.max(0, Number(minReadParam)) : 0;
	const sort = sortParam || "latest";
	const from = (page - 1) * BLOG_PER_PAGE;
	const to = from + BLOG_PER_PAGE - 1;

	const [popularTagsResult, matchedAuthorProfiles] = await Promise.all([
		supabase
			.from("blog_posts")
			.select("tags")
			.eq("status", "published")
			.order("updated_at", { ascending: false })
			.limit(240),
		author.length > 0
			? supabase
					.from("profiles")
					.select("id")
					.or(`display_name.ilike.%${author.replace(/[,%_]/g, "")}%,mention_handle.ilike.%${author.replace(/[,%_]/g, "")}%`)
					.limit(80)
			: Promise.resolve({ data: [] as Array<{ id: string }> }),
	]);

	const popularTagCounts = new Map<string, number>();
	for (const post of popularTagsResult.data ?? []) {
		for (const rawTag of post.tags ?? []) {
			const normalized = String(rawTag).trim().toLowerCase();
			if (!normalized) continue;
			popularTagCounts.set(normalized, (popularTagCounts.get(normalized) ?? 0) + 1);
		}
	}
	const popularTags = Array.from(popularTagCounts.entries())
		.sort((left, right) => right[1] - left[1])
		.slice(0, 12)
		.map(([value]) => value);

	const authorIds = Array.from(new Set((matchedAuthorProfiles.data ?? []).map((row) => row.id)));
	if (author.length > 0 && authorIds.length === 0) {
		return (
			<div className="space-y-6">
				<header className="space-y-3">
					<Badge>{t("nav.blog")}</Badge>
					<h1 className="font-heading text-4xl text-(--espresso)">{t("blog.title")}</h1>
					<p className="max-w-3xl text-(--muted)">{t("blog.subtitle")}</p>
					<BlogSearchControls
						locale={locale}
						initialQuery={q}
						initialTag={tag}
						initialAuthor={author}
						initialMinRead={minReadParam}
						initialSort={sort}
						popularTags={popularTags}
					/>
				</header>
				<Card>
					<CardTitle>{t("blog.noResultsTitle")}</CardTitle>
					<p className="mt-2 text-sm text-(--muted)">{t("blog.noResultsDescription")}</p>
				</Card>
			</div>
		);
	}

	let postsQuery = supabase
		.from("blog_posts")
		.select(
			"id, slug, title_en, title_id, excerpt_en, excerpt_id, hero_image_url, hero_image_alt_en, hero_image_alt_id, tags, reading_time_minutes, published_at, updated_at, author_id",
			{ count: "exact" },
		)
		.eq("status", "published")
		.gte("reading_time_minutes", minRead)
		.range(from, to);

	if (q.length > 0) {
		const escaped = q.replace(/[,%_]/g, "").trim();
		if (escaped.length > 0) {
			postsQuery = postsQuery.or(
				`title_en.ilike.%${escaped}%,title_id.ilike.%${escaped}%,excerpt_en.ilike.%${escaped}%,excerpt_id.ilike.%${escaped}%`,
			);
		}
	}
	if (tag.length > 0) {
		postsQuery = postsQuery.contains("tags", [tag]);
	}
	if (authorIds.length > 0) {
		postsQuery = postsQuery.in("author_id", authorIds);
	}

	if (sort === "oldest") {
		postsQuery = postsQuery.order("published_at", { ascending: true });
	} else if (sort === "longest_read") {
		postsQuery = postsQuery
			.order("reading_time_minutes", { ascending: false })
			.order("published_at", { ascending: false });
	} else if (sort === "shortest_read") {
		postsQuery = postsQuery
			.order("reading_time_minutes", { ascending: true })
			.order("published_at", { ascending: false });
	} else {
		postsQuery = postsQuery.order("published_at", { ascending: false });
	}

	const { data: postRows, count: totalRows } = await postsQuery;
	const totalPages = Math.max(1, Math.ceil((totalRows ?? 0) / BLOG_PER_PAGE));

	const postAuthorIds = Array.from(
		new Set((postRows ?? []).map((post) => post.author_id).filter((id): id is string => typeof id === "string")),
	);
	const postIds = (postRows ?? []).map((post) => post.id);
	const [{ data: postAuthors }, { data: reactionRows }] = await Promise.all([
		postAuthorIds.length > 0
			? supabase.from("profiles").select("id, display_name, mention_handle").in("id", postAuthorIds)
			: Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null; mention_handle: string | null }> }),
		postIds.length > 0
			? supabase.from("blog_reactions").select("post_id, reaction").in("post_id", postIds)
			: Promise.resolve({ data: [] as Array<{ post_id: string; reaction: ForumReactionType }> }),
	]);

	const authorNameMap = new Map(
		(postAuthors ?? []).map((profile) => [
			profile.id,
			profile.display_name || profile.mention_handle || "Unknown author",
		]),
	);
	const reactionsByPostId = new Map<string, Record<ForumReactionType, number>>();
	for (const postId of postIds) {
		reactionsByPostId.set(postId, emptyReactionCounts());
	}
	for (const row of reactionRows ?? []) {
		if (!FORUM_REACTION_TYPES.includes(row.reaction as ForumReactionType)) continue;
		const current = reactionsByPostId.get(row.post_id) ?? emptyReactionCounts();
		const key = row.reaction as ForumReactionType;
		current[key] = (current[key] ?? 0) + 1;
		reactionsByPostId.set(row.post_id, current);
	}

	const posts =
		(postRows ?? []).length > 0
			? (postRows ?? []).map((post) => ({
					slug: post.slug,
					title: locale === "id" ? post.title_id : post.title_en,
					excerpt: locale === "id" ? post.excerpt_id : post.excerpt_en,
					imageUrl: post.hero_image_url,
					imageAlt: locale === "id" ? post.hero_image_alt_id : post.hero_image_alt_en,
					publishedAt: post.published_at ?? post.updated_at,
					readingTime: post.reading_time_minutes,
					tags: post.tags,
					authorName: authorNameMap.get(String(post.author_id)) ?? "Unknown author",
					reactionCounts: reactionsByPostId.get(String(post.id)) ?? emptyReactionCounts(),
				}))
			: BLOG_POSTS.map((post) => {
					const localized = localizeBlogText(post, locale);
					return {
						slug: post.slug,
						title: localized.title,
						excerpt: localized.excerpt,
						imageUrl: post.imageUrl,
						imageAlt: localized.imageAlt,
						publishedAt: post.publishedAt,
						readingTime: Math.max(3, Math.ceil(post.bodyEn.join(" ").split(/\s+/).length / 220)),
						tags: [],
						authorName: "Coffee Brew Team",
						reactionCounts: emptyReactionCounts(),
					};
				});

	const featuredPost = posts[0] ?? null;
	const secondaryPosts = featuredPost ? posts.slice(1) : [];
	const baseFilterParams = {
		q,
		tag,
		author,
		minRead: minReadParam,
		sort,
	};

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<Badge>{t("nav.blog")}</Badge>
				<h1 className="font-heading text-4xl text-(--espresso)">{t("blog.title")}</h1>
				<p className="max-w-3xl text-(--muted)">{t("blog.subtitle")}</p>
				<BlogSearchControls
					locale={locale}
					initialQuery={q}
					initialTag={tag}
					initialAuthor={author}
					initialMinRead={minReadParam}
					initialSort={sort}
					popularTags={popularTags}
				/>
			</header>

			{posts.length === 0 ? (
				<Card>
					<CardTitle>{t("blog.noResultsTitle")}</CardTitle>
					<p className="mt-2 text-sm text-(--muted)">{t("blog.noResultsDescription")}</p>
				</Card>
			) : (
				<div className="space-y-4">
					{featuredPost ? (
						<Link href={`/blog/${featuredPost.slug}`} className="block">
							<Card className="overflow-hidden p-0 transition hover:-translate-y-1">
								<div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
									<div className="relative min-h-60">
										<Image
											src={featuredPost.imageUrl}
											alt={featuredPost.imageAlt}
											fill
											sizes="(max-width: 1024px) 100vw, 65vw"
											loading="eager"
											className="object-cover"
										/>
									</div>
									<div className="space-y-3 p-6">
										<p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--accent)">
											{locale === "id" ? "Artikel Pilihan" : "Featured Story"}
										</p>
										<h2 className="font-heading text-3xl text-(--espresso)">{featuredPost.title}</h2>
										<RichTextContent html={featuredPost.excerpt} className="line-clamp-4 text-sm text-(--muted)" />
										<div className="flex flex-wrap items-center gap-2 text-xs text-(--muted)">
											<span>{featuredPost.authorName}</span>
											<span>•</span>
											<span>{formatDate(featuredPost.publishedAt, locale)}</span>
											<span>•</span>
											<span>
												{featuredPost.readingTime} {locale === "id" ? "menit baca" : "min read"}
											</span>
										</div>
										<div className="flex flex-wrap items-center gap-2">
											{featuredPost.tags.slice(0, 5).map((postTag: string) => (
												<span
													key={`${featuredPost.slug}-${postTag}`}
													className="rounded-full border px-2 py-0.5 text-xs text-(--muted)"
												>
													#{postTag}
												</span>
											))}
										</div>
										<div className="flex flex-wrap items-center gap-2 text-xs text-(--muted)">
											{FORUM_REACTION_TYPES.map((reactionType) => (
												<span
													key={`${featuredPost.slug}-${reactionType}`}
													className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
												>
													{REACTION_EMOJI[reactionType]} {featuredPost.reactionCounts[reactionType] ?? 0}
												</span>
											))}
										</div>
									</div>
								</div>
							</Card>
						</Link>
					) : null}

					{secondaryPosts.length > 0 ? (
						<div className="grid gap-4 md:grid-cols-2">
							{secondaryPosts.map((post) => (
								<Link key={post.slug} href={`/blog/${post.slug}`}>
									<Card className="h-full overflow-hidden p-0 transition hover:-translate-y-1">
										<div className="relative h-52 border-b">
											<Image
												src={post.imageUrl}
												alt={post.imageAlt}
												fill
												sizes="(max-width: 768px) 100vw, 50vw"
												className="object-cover"
											/>
										</div>
										<div className="space-y-3 p-5">
											<CardTitle>{post.title}</CardTitle>
											<RichTextContent html={post.excerpt} className="line-clamp-3 text-sm text-(--muted)" />
											<p className="text-xs text-(--muted)">
												{post.authorName} · {post.readingTime} {locale === "id" ? "menit baca" : "min read"}
											</p>
											<div className="flex flex-wrap items-center gap-2 text-xs text-(--muted)">
												{FORUM_REACTION_TYPES.map((reactionType) => (
													<span
														key={`${post.slug}-${reactionType}`}
														className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
													>
														{REACTION_EMOJI[reactionType]} {post.reactionCounts[reactionType] ?? 0}
													</span>
												))}
											</div>
											{post.tags.length > 0 ? (
												<div className="flex flex-wrap gap-2">
													{post.tags.slice(0, 5).map((postTag: string) => (
														<span
															key={`${post.slug}-tag-${postTag}`}
															className="rounded-full border px-2 py-0.5 text-xs text-(--muted)"
														>
															#{postTag}
														</span>
													))}
												</div>
											) : null}
											<p className="text-xs text-(--muted)">{formatDate(post.publishedAt, locale)}</p>
										</div>
									</Card>
								</Link>
							))}
						</div>
					) : null}

					{totalPages > 1 ? (
						<div className="flex flex-wrap items-center justify-center gap-2">
							{page > 1 ? (
								<Link
									href={buildBlogHref(page - 1, baseFilterParams)}
									className="rounded-full border bg-(--surface-elevated) px-3.5 py-1.5 text-sm font-medium text-(--muted) transition hover:bg-(--sand)/20"
								>
									{locale === "id" ? "Sebelumnya" : "Previous"}
								</Link>
							) : null}
							<span className="text-sm text-(--muted)">
								{locale === "id" ? "Halaman" : "Page"} {page} / {totalPages}
							</span>
							{page < totalPages ? (
								<Link
									href={buildBlogHref(page + 1, baseFilterParams)}
									className="rounded-full border bg-(--surface-elevated) px-3.5 py-1.5 text-sm font-medium text-(--muted) transition hover:bg-(--sand)/20"
								>
									{locale === "id" ? "Berikutnya" : "Next"}
								</Link>
							) : null}
						</div>
					) : null}
				</div>
			)}
		</div>
	);
}
