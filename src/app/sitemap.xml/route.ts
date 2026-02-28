import { BLOG_POSTS } from "@/lib/content/blog";

export async function GET() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const staticRoutes = ["", "/about", "/contact", "/blog", "/catalog", "/forum", "/login", "/signup", "/sitemap"];

	const urls = [
		...staticRoutes.map((route) => `${baseUrl}${route}`),
		...BLOG_POSTS.map((post) => `${baseUrl}/blog/${post.slug}`),
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
		},
	});
}
