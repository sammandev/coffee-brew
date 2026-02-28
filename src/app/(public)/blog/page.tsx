import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { BLOG_POSTS, localizeBlogText } from "@/lib/content/blog";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublishedBlogPosts } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function BlogPage() {
	const { locale, t } = await getServerI18n();
	const dbPosts = await getPublishedBlogPosts(60);

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

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{t("nav.blog")}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("blog.title")}</h1>
				<p className="text-[var(--muted)]">{t("blog.subtitle")}</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				{posts.map((post) => {
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
		</div>
	);
}
