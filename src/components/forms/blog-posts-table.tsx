import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface BlogRow {
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

export function BlogPostsTable({
	locale,
	onEdit,
	posts,
}: {
	locale: "en" | "id";
	onEdit: (postId: string) => void;
	posts: BlogRow[];
}) {
	if (posts.length === 0) {
		return (
			<Card>
				<p className="text-sm text-(--muted)">{locale === "id" ? "Belum ada postingan blog." : "No blog posts yet."}</p>
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			{posts.map((post) => (
				<Card key={post.id} className="space-y-3">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<p className="font-semibold text-(--espresso)">{locale === "id" ? post.title_id : post.title_en}</p>
							<p className="text-xs text-(--muted)">/{post.slug}</p>
						</div>
						<div className="rounded-full border px-3 py-1 text-xs font-semibold">{post.status}</div>
					</div>

					{post.tags.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{post.tags.map((tag) => (
								<span key={`${post.id}-${tag}`} className="rounded-full border px-2 py-0.5 text-xs text-(--muted)">
									#{tag}
								</span>
							))}
						</div>
					)}

					<p className="text-xs text-(--muted)">
						{locale === "id" ? "Penulis" : "Author"}: {post.author_name}
						{post.editor_name ? ` • ${locale === "id" ? "Editor" : "Editor"}: ${post.editor_name}` : ""}
					</p>
					<p className="text-xs text-(--muted)">
						{locale === "id" ? "Diperbarui" : "Updated"}: {formatDate(post.updated_at, locale)} • {post.reading_time_minutes}{" "}
						{locale === "id" ? "menit baca" : "min read"}
					</p>
					{post.published_at && (
						<p className="text-xs text-(--muted)">
							{locale === "id" ? "Dipublikasikan" : "Published"}: {formatDate(post.published_at, locale)}
						</p>
					)}

					<div>
						<Button size="sm" variant="outline" onClick={() => onEdit(post.id)}>
							{locale === "id" ? "Ubah" : "Edit"}
						</Button>
					</div>
				</Card>
			))}
		</div>
	);
}
