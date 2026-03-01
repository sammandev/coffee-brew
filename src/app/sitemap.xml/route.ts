import { BLOG_POSTS } from "@/lib/content/blog";
import { getPublishedBlogPosts } from "@/lib/queries";

export async function GET() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const staticRoutes = ["", "/about", "/contact", "/blog", "/catalog", "/forum", "/login", "/signup", "/sitemap"];
	const dbPosts = await getPublishedBlogPosts(500);
	const blogSlugs = dbPosts.length > 0 ? dbPosts.map((post) => post.slug) : BLOG_POSTS.map((post) => post.slug);

	const urls = [
		...staticRoutes.map((route) => `${baseUrl}${route}`),
		...blogSlugs.map((slug) => `${baseUrl}/blog/${slug}`),
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map((url) => {
		return `  <url><loc>${url}</loc><lastmod>${new Date().toISOString()}</lastmod></url>`;
	})
	.join("\n")}
</urlset>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
		},
	});
}
