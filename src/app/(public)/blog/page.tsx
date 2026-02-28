import Image from "next/image";
import Link from "next/link";
import { BlogSearchControls } from "@/components/blog/blog-search-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { BLOG_POSTS, localizeBlogText } from "@/lib/content/blog";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublishedBlogPosts } from "@/lib/queries";
import { clampPlainText } from "@/lib/rich-text";
import { formatDate } from "@/lib/utils";

interface BlogPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
	const [{ locale, t }, dbPosts, params] = await Promise.all([
		getServerI18n(),
		getPublishedBlogPosts(100),
		searchParams,
	]);
	const q = getFirstParam(params.q).trim().toLowerCase();
	const tag = getFirstParam(params.tag).trim().toLowerCase();
	const author = getFirstParam(params.author).trim().toLowerCase();
	const minReadParam = getFirstParam(params.minRead).trim();
	const sortParam = getFirstParam(params.sort).trim();
	const minRead = Number.isFinite(Number(minReadParam)) ? Math.max(0, Number(minReadParam)) : 0;
	const sort = sortParam || "latest";

	const posts =
		dbPosts.length > 0
			? dbPosts.map((post) => ({
					slug: post.slug,
					title: locale === "id" ? post.title_id : post.title_en,
					excerpt: locale === "id" ? post.excerpt_id : post.excerpt_en,
					imageUrl: post.hero_image_url,
					imageAlt: locale === "id" ? post.hero_image_alt_id : post.hero_image_alt_en,
					publishedAt: post.published_at ?? post.updated_at,
					readingTime: post.reading_time_minutes,
					tags: post.tags,
					authorName: post.author_name,
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
					};
				});

	const popularTagCounts = new Map<string, number>();
	for (const post of posts) {
		for (const rawTag of post.tags ?? []) {
			const normalized = rawTag.trim().toLowerCase();
			if (!normalized) continue;
			popularTagCounts.set(normalized, (popularTagCounts.get(normalized) ?? 0) + 1);
		}
	}
	const popularTags = Array.from(popularTagCounts.entries())
		.sort((left, right) => right[1] - left[1])
		.slice(0, 12)
		.map(([value]) => value);

	const filteredPosts = posts
		.filter((post) => {
			if (q.length === 0) return true;
			const haystack = `${post.title} ${clampPlainText(post.excerpt, 1000)}`.toLowerCase();
			return haystack.includes(q);
		})
		.filter((post) => {
			if (tag.length === 0) return true;
			return (post.tags ?? []).some((postTag: string) => postTag.trim().toLowerCase() === tag);
		})
		.filter((post) => {
			if (author.length === 0) return true;
			return post.authorName.toLowerCase().includes(author);
		})
		.filter((post) => post.readingTime >= minRead)
		.sort((left, right) => {
			if (sort === "oldest") {
				return new Date(left.publishedAt).getTime() - new Date(right.publishedAt).getTime();
			}
			if (sort === "longest_read") {
				if (right.readingTime !== left.readingTime) return right.readingTime - left.readingTime;
				return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
			}
			if (sort === "shortest_read") {
				if (left.readingTime !== right.readingTime) return left.readingTime - right.readingTime;
				return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
			}
			return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
		});

	return (
		<div className="space-y-6">
			<header className="space-y-3">
				<Badge>{t("nav.blog")}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("blog.title")}</h1>
				<p className="text-[var(--muted)]">{t("blog.subtitle")}</p>
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

			{filteredPosts.length === 0 ? (
				<Card>
					<CardTitle>{t("blog.noResultsTitle")}</CardTitle>
					<p className="mt-2 text-sm text-[var(--muted)]">{t("blog.noResultsDescription")}</p>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{filteredPosts.map((post) => {
						return (
							<Link key={post.slug} href={`/blog/${post.slug}`}>
								<Card className="h-full overflow-hidden transition hover:-translate-y-1">
									<div className="relative -m-6 mb-4 h-52 border-b">
										<Image
											src={post.imageUrl}
											alt={post.imageAlt}
											fill
											sizes="(max-width: 768px) 100vw, 50vw"
											className="object-cover"
										/>
									</div>
									<CardTitle>{post.title}</CardTitle>
									<RichTextContent html={post.excerpt} className="mt-2 line-clamp-3 text-[var(--muted)]" />
									<p className="mt-3 text-xs text-[var(--muted)]">
										{post.authorName} · {post.readingTime} {locale === "id" ? "menit baca" : "min read"}
									</p>
									{post.tags.length > 0 && (
										<div className="mt-3 flex flex-wrap gap-2">
											{post.tags.map((tag: string) => (
												<span key={`${post.slug}-${tag}`} className="rounded-full border px-2 py-0.5 text-xs text-[var(--muted)]">
													#{tag}
												</span>
											))}
										</div>
									)}
									<p className="mt-4 text-xs text-[var(--muted)]">{formatDate(post.publishedAt, locale)}</p>
								</Card>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
