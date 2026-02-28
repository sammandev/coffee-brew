import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogPostForm } from "@/components/forms/blog-post-form";
import { Button } from "@/components/ui/button";
import { getServerI18n } from "@/lib/i18n/server";
import { getAdminBlogPostById } from "@/lib/queries";
import type { BlogPostRecord } from "@/lib/types";

export default async function DashboardBlogEditPage({ params }: { params: Promise<{ id: string }> }) {
	const [{ id }, { locale }] = await Promise.all([params, getServerI18n()]);
	const post = await getAdminBlogPostById(id);

	if (!post) {
		notFound();
	}

	const mappedPost: BlogPostRecord = {
		id: post.id,
		slug: post.slug,
		title_en: post.title_en,
		title_id: post.title_id,
		excerpt_en: post.excerpt_en,
		excerpt_id: post.excerpt_id,
		body_en: post.body_en,
		body_id: post.body_id,
		hero_image_url: post.hero_image_url,
		hero_image_alt_en: post.hero_image_alt_en,
		hero_image_alt_id: post.hero_image_alt_id,
		tags: Array.isArray(post.tags) ? post.tags : [],
		reading_time_minutes: Number(post.reading_time_minutes ?? 0),
		status: post.status,
		author_id: post.author_id ?? null,
		editor_id: post.editor_id ?? null,
		published_at: post.published_at ?? null,
		created_at: post.created_at,
		updated_at: post.updated_at,
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Ubah Blog" : "Edit Blog Post"}</h1>
				<Link href="/dashboard/blog">
					<Button variant="outline" size="sm">
						{locale === "id" ? "Kembali" : "Back"}
					</Button>
				</Link>
			</div>

			<div className="rounded-3xl border bg-[var(--surface-elevated)] p-5">
				<BlogPostForm formId="blog-route-edit-form" mode="edit" post={mappedPost} />
				<div className="mt-5 border-t border-[var(--border)] pt-4">
					<div className="flex justify-end">
						<Button type="submit" form="blog-route-edit-form">
							{locale === "id" ? "Simpan" : "Save"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
