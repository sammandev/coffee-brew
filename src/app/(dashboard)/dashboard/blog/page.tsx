import { BlogPostsManager } from "@/components/forms/blog-posts-manager";
import { getServerI18n } from "@/lib/i18n/server";
import { getAdminBlogPosts } from "@/lib/queries";

interface TablePostRow {
	id: string;
	slug: string;
	title_en: string;
	title_id: string;
	status: string;
	tags: string[];
	reading_time_minutes: number;
	published_at: string | null;
	updated_at: string;
	author_name: string;
	editor_name: string | null;
}

export default async function DashboardBlogPage() {
	const [{ locale }, posts] = await Promise.all([getServerI18n(), getAdminBlogPosts(120)]);

	const tablePosts: TablePostRow[] = posts.map((post) => ({
		id: post.id,
		slug: post.slug,
		title_en: post.title_en,
		title_id: post.title_id,
		status: post.status,
		tags: Array.isArray(post.tags) ? post.tags : [],
		reading_time_minutes: Number(post.reading_time_minutes ?? 0),
		published_at: post.published_at ?? null,
		updated_at: post.updated_at,
		author_name: post.author_name,
		editor_name: post.editor_name,
	}));

	return <BlogPostsManager locale={locale} posts={tablePosts} />;
}
