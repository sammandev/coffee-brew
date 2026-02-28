import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getBlogPostBySlug, localizeBlogText } from "@/lib/content/blog";
import { getServerI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const [{ slug }, { locale }] = await Promise.all([params, getServerI18n()]);

	const post = getBlogPostBySlug(slug);
	if (!post) {
		notFound();
	}

	const localized = localizeBlogText(post, locale);

	return (
		<article className="space-y-6">
			<header className="space-y-2">
				<Badge>Blog</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{localized.title}</h1>
				<p className="text-xs text-[var(--muted)]">{formatDate(post.publishedAt, locale)}</p>
			</header>

			<div className="relative h-80 overflow-hidden rounded-3xl border">
				<Image
					src={post.imageUrl}
					alt={localized.imageAlt}
					fill
					sizes="(max-width: 1024px) 100vw, 896px"
					className="object-cover"
				/>
			</div>

			<Card className="space-y-4">
				{localized.body.map((paragraph) => (
					<p key={paragraph} className="text-[var(--muted)]">
						{paragraph}
					</p>
				))}
			</Card>
		</article>
	);
}
