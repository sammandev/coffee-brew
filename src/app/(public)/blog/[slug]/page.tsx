import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getBlogPostBySlug, localizeBlogText } from "@/lib/content/blog";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublishedBlogPostBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const [{ slug }, { locale }] = await Promise.all([params, getServerI18n()]);

	const dbPost = await getPublishedBlogPostBySlug(slug);
	const staticPost = dbPost ? null : getBlogPostBySlug(slug);

	if (!dbPost && !staticPost) {
		notFound();
	}

	const localized = staticPost ? localizeBlogText(staticPost, locale) : null;
	const title = dbPost ? (locale === "id" ? dbPost.title_id : dbPost.title_en) : (localized?.title ?? "");
	const imageAlt = dbPost
		? locale === "id"
			? dbPost.hero_image_alt_id
			: dbPost.hero_image_alt_en
		: (localized?.imageAlt ?? "");
	const publishedAt = dbPost
		? (dbPost.published_at ?? dbPost.created_at)
		: (staticPost?.publishedAt ?? new Date().toISOString());
	const updatedAt = dbPost ? dbPost.updated_at : (staticPost?.publishedAt ?? new Date().toISOString());
	const authorName = dbPost ? dbPost.author_name : "Coffee Brew Team";
	const editorName = dbPost ? dbPost.editor_name : null;
	const readingTime = dbPost
		? dbPost.reading_time_minutes
		: Math.max(3, Math.ceil((localized?.body.join(" ") ?? "").split(/\s+/).length / 220));
	const tags = dbPost?.tags ?? [];
	const body = dbPost ? (locale === "id" ? dbPost.body_id : dbPost.body_en) : (localized?.body ?? []).join("\n\n");

	return (
		<article className="space-y-6">
			<header className="space-y-2">
				<Badge>Blog</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{title}</h1>
				<p className="text-xs text-[var(--muted)]">
					{locale === "id" ? "Dibuat oleh" : "Posted by"} {authorName}
				</p>
				<p className="text-xs text-[var(--muted)]">
					{locale === "id" ? "Diupdate" : "Updated"} {formatDate(updatedAt, locale)}
					{editorName ? ` • ${locale === "id" ? "Diedit oleh" : "Edited by"} ${editorName}` : ""}
				</p>
				<p className="text-xs text-[var(--muted)]">
					{formatDate(publishedAt, locale)} • {readingTime} {locale === "id" ? "menit baca" : "min read"}
				</p>
				{tags.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{tags.map((tag: string) => (
							<span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-[var(--muted)]">
								#{tag}
							</span>
						))}
					</div>
				)}
			</header>

			<div className="relative h-80 overflow-hidden rounded-3xl border">
				<Image
					src={dbPost ? dbPost.hero_image_url : (staticPost?.imageUrl ?? "")}
					alt={imageAlt}
					fill
					sizes="(max-width: 1024px) 100vw, 896px"
					className="object-cover"
				/>
			</div>

			<Card className="space-y-4">
				<RichTextContent html={body} className="text-[var(--muted)]" />
			</Card>
		</article>
	);
}
