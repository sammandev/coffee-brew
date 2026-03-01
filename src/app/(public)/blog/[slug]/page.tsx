import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogReactionPanel } from "@/components/blog/blog-reaction-panel";
import { BlogTtsControls } from "@/components/blog/blog-tts-controls";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { getSessionContext } from "@/lib/auth";
import { FORUM_REACTION_TYPES, type ForumReactionType, REACTION_EMOJI } from "@/lib/constants";
import { getBlogPostBySlug, localizeBlogText } from "@/lib/content/blog";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublishedBlogPostBySlug } from "@/lib/queries";
import { toPlainText } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

function emptyReactionCounts() {
	return Object.fromEntries(FORUM_REACTION_TYPES.map((reactionType) => [reactionType, 0])) as Record<
		ForumReactionType,
		number
	>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const [dbPost, staticPost] = await Promise.all([
		getPublishedBlogPostBySlug(slug),
		Promise.resolve(getBlogPostBySlug(slug)),
	]);
	const title = dbPost?.title_en ?? staticPost?.titleEn ?? "Blog";
	const excerpt = dbPost?.excerpt_en ?? staticPost?.excerptEn ?? "Coffee Brew educational stories and tutorials.";
	return {
		title,
		description: toPlainText(excerpt).slice(0, 200),
	};
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const [{ slug }, { locale }, session] = await Promise.all([params, getServerI18n(), getSessionContext()]);

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
	const safeArticleText = toPlainText(body);
	const reactionCounts = (dbPost?.reaction_counts ?? emptyReactionCounts()) as Record<ForumReactionType, number>;
	let myReaction: ForumReactionType | null = null;

	if (dbPost && session) {
		const supabase = await createSupabaseServerClient();
		const { data: myReactionRow } = await supabase
			.from("blog_reactions")
			.select("reaction")
			.eq("post_id", dbPost.id)
			.eq("user_id", session.userId)
			.maybeSingle();
		if (myReactionRow && FORUM_REACTION_TYPES.includes(myReactionRow.reaction as ForumReactionType)) {
			myReaction = myReactionRow.reaction as ForumReactionType;
		}
	}

	return (
		<article className="space-y-6">
			<header className="space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<Badge>{locale === "id" ? "Artikel Edukasi" : "Educational Story"}</Badge>
					{tags.slice(0, 4).map((tag: string) => (
						<span key={tag} className="rounded-full border px-2 py-0.5 text-xs text-(--muted)">
							#{tag}
						</span>
					))}
				</div>
				<h1 className="font-heading text-4xl leading-tight text-[var(--espresso)] md:text-5xl">{title}</h1>
				<div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
					<span>
						{locale === "id" ? "Dibuat oleh" : "Posted by"} {authorName}
					</span>
					<span>•</span>
					<span>
						{formatDate(publishedAt, locale)} • {readingTime} {locale === "id" ? "menit baca" : "min read"}
					</span>
					{editorName ? (
						<>
							<span>•</span>
							<span>
								{locale === "id" ? "Diedit oleh" : "Edited by"} {editorName}
							</span>
						</>
					) : null}
					{updatedAt !== publishedAt ? (
						<>
							<span>•</span>
							<span>
								{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(updatedAt, locale)}
							</span>
						</>
					) : null}
				</div>
			</header>

			<div className="relative overflow-hidden rounded-3xl border">
				<div className="relative h-[300px] md:h-[420px]">
					<Image
						src={dbPost ? dbPost.hero_image_url : (staticPost?.imageUrl ?? "")}
						alt={imageAlt}
						fill
						sizes="(max-width: 1024px) 100vw, 960px"
						loading="eager"
						className="object-cover"
					/>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
				<Card className="space-y-4">
					<RichTextContent html={body} className="text-[var(--muted)]" />
				</Card>

				<div className="space-y-4">
					<BlogTtsControls locale={locale} text={safeArticleText} />
					{dbPost ? (
						<BlogReactionPanel
							postId={dbPost.id}
							canReact={Boolean(session)}
							initialCounts={reactionCounts}
							initialMyReaction={myReaction}
							loginHref={`/login?next=${encodeURIComponent(`/blog/${slug}`)}`}
						/>
					) : (
						<section className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-4">
							<h2 className="font-heading text-lg text-(--espresso)">
								{locale === "id" ? "Reaksi Artikel" : "Article Reactions"}
							</h2>
							<div className="flex flex-wrap items-center gap-2 text-xs text-(--muted)">
								{FORUM_REACTION_TYPES.map((reactionType) => (
									<span key={reactionType} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
										{REACTION_EMOJI[reactionType]} {reactionCounts[reactionType] ?? 0}
									</span>
								))}
							</div>
							<p className="text-xs text-(--muted)">
								{locale === "id"
									? "Artikel statis hanya menampilkan hitungan reaksi."
									: "Static posts show reaction counts only."}
							</p>
						</section>
					)}
					<Link
						href="/blog"
						className="inline-flex rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/20"
					>
						{locale === "id" ? "Kembali ke Blog" : "Back to Blog"}
					</Link>
				</div>
			</div>
		</article>
	);
}
