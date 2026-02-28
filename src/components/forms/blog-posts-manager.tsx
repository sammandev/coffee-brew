"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BlogPostForm } from "@/components/forms/blog-post-form";
import { BlogPostsTable } from "@/components/forms/blog-posts-table";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/ui/delete-modal";
import { FormModal } from "@/components/ui/form-modal";
import type { BlogPostRecord } from "@/lib/types";

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

export function BlogPostsManager({ locale, posts }: { locale: "en" | "id"; posts: TablePostRow[] }) {
	const { t } = useAppPreferences();
	const router = useRouter();
	const [createOpen, setCreateOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [loadingPost, setLoadingPost] = useState(false);
	const [editPost, setEditPost] = useState<BlogPostRecord | null>(null);
	const [createSubmitting, setCreateSubmitting] = useState(false);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const createFormId = "blog-create-form";
	const editFormId = "blog-edit-form";

	async function openEdit(postId: string) {
		setLoadingPost(true);
		setError(null);

		const response = await fetch(`/api/admin/blog/${postId}`).catch(() => null);
		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal memuat blog." : "Could not load blog post."));
			setLoadingPost(false);
			return;
		}

		const body = (await response.json()) as { post?: BlogPostRecord };
		setEditPost(body.post ?? null);
		setEditOpen(true);
		setLoadingPost(false);
	}

	function onSaved() {
		setCreateOpen(false);
		setEditOpen(false);
		router.refresh();
	}

	function onDeleted() {
		setEditOpen(false);
		setEditPost(null);
		router.refresh();
	}

	async function onDeletePost() {
		if (!editPost) return;

		setIsDeleting(true);
		setError(null);

		const response = await fetch(`/api/admin/blog/${editPost.id}`, {
			method: "DELETE",
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menghapus blog." : "Could not delete blog post."));
			setIsDeleting(false);
			return;
		}

		setIsDeleting(false);
		setDeleteOpen(false);
		onDeleted();
	}

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-heading text-4xl text-(--espresso)">Blog CMS</h1>
					<p className="mt-2 text-(--muted)">
						{locale === "id"
							? "Kelola konten blog lengkap: judul, body, tag, gambar Unsplash, metadata, dan status publikasi."
							: "Manage full blog content: title, body, tags, Unsplash image, metadata, and publish status."}
					</p>
				</div>

				<div className="flex gap-2">
					<Link href="/blog">
						<Button variant="outline" size="sm">
							{locale === "id" ? "Lihat Blog Publik" : "View Public Blog"}
						</Button>
					</Link>
					<Button type="button" onClick={() => setCreateOpen(true)}>
						{locale === "id" ? "Tambah Blog" : "Add Blog"}
					</Button>
				</div>
			</header>

			<BlogPostsTable locale={locale} posts={posts} onEdit={openEdit} />
			{loadingPost ? <p className="text-sm text-(--muted)">{t("common.loading")}</p> : null}
			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

			<FormModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				title={locale === "id" ? "Tambah Blog" : "Add Blog Post"}
				description={locale === "id" ? "Buat postingan blog baru." : "Create a new blog post."}
				closeDisabled={createSubmitting}
				allowFullscreen
				defaultFullscreen
				footer={
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
							{locale === "id" ? "Batal" : "Cancel"}
						</Button>
						<Button type="submit" form={createFormId} disabled={createSubmitting}>
							{createSubmitting ? (locale === "id" ? "Menyimpan..." : "Saving...") : locale === "id" ? "Simpan" : "Save"}
						</Button>
					</div>
				}
			>
				<BlogPostForm formId={createFormId} mode="create" onSaved={onSaved} onSubmittingChange={setCreateSubmitting} />
			</FormModal>

			<FormModal
				open={editOpen}
				onClose={() => setEditOpen(false)}
				title={locale === "id" ? "Ubah Blog" : "Edit Blog Post"}
				description={locale === "id" ? "Perbarui konten blog." : "Update blog post content."}
				closeDisabled={editSubmitting || isDeleting}
				allowFullscreen
				defaultFullscreen
				footer={
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							{editPost ? (
								<Button
									type="button"
									variant="destructive"
									onClick={() => setDeleteOpen(true)}
									disabled={editSubmitting || isDeleting}
								>
									{locale === "id" ? "Hapus" : "Delete"}
								</Button>
							) : null}
						</div>
						<div className="flex gap-2">
							<Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={editSubmitting || isDeleting}>
								{locale === "id" ? "Batal" : "Cancel"}
							</Button>
							<Button type="submit" form={editFormId} disabled={editSubmitting || isDeleting}>
								{editSubmitting ? (locale === "id" ? "Menyimpan..." : "Saving...") : locale === "id" ? "Simpan" : "Save"}
							</Button>
						</div>
					</div>
				}
			>
				{editPost ? (
					<BlogPostForm
						formId={editFormId}
						mode="edit"
						post={editPost}
						onSaved={onSaved}
						onSubmittingChange={setEditSubmitting}
					/>
				) : null}
			</FormModal>

			<DeleteModal
				open={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				onConfirm={onDeletePost}
				isSubmitting={isDeleting}
				title={locale === "id" ? "Hapus Blog" : "Delete Blog Post"}
				description={
					locale === "id" ? "Postingan blog akan dihapus permanen." : "This blog post will be permanently deleted."
				}
				confirmLabel={locale === "id" ? "Hapus" : "Delete"}
			/>
		</div>
	);
}
