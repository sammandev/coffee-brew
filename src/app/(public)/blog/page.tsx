import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { BLOG_POSTS, localizeBlogText } from "@/lib/content/blog";
import { getServerI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";

export default async function BlogPage() {
	const { locale, t } = await getServerI18n();

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{t("nav.blog")}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("blog.title")}</h1>
				<p className="text-[var(--muted)]">{t("blog.subtitle")}</p>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				{BLOG_POSTS.map((post) => {
					const localized = localizeBlogText(post, locale);
					return (
						<Link key={post.slug} href={`/blog/${post.slug}`}>
							<Card className="h-full overflow-hidden transition hover:-translate-y-1">
								<div className="relative -m-6 mb-4 h-52 border-b">
									<Image
										src={post.imageUrl}
										alt={localized.imageAlt}
										fill
										sizes="(max-width: 768px) 100vw, 50vw"
										className="object-cover"
									/>
								</div>
								<CardTitle>{localized.title}</CardTitle>
								<CardDescription className="mt-2">{localized.excerpt}</CardDescription>
								<p className="mt-4 text-xs text-[var(--muted)]">{formatDate(post.publishedAt, locale)}</p>
							</Card>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
