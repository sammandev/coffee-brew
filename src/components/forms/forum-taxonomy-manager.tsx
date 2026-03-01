"use client";

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ForumCategory, ForumSubforum } from "@/lib/types";

interface ForumTaxonomyManagerProps {
	categories: ForumCategory[];
	subforums: ForumSubforum[];
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function ForumTaxonomyManager({ categories, subforums }: ForumTaxonomyManagerProps) {
	const { locale } = useAppPreferences();
	const [categoryNameEn, setCategoryNameEn] = useState("");
	const [categoryNameId, setCategoryNameId] = useState("");
	const [categoryDescriptionEn, setCategoryDescriptionEn] = useState("");
	const [categoryDescriptionId, setCategoryDescriptionId] = useState("");
	const [subforumCategoryId, setSubforumCategoryId] = useState(categories[0]?.id ?? "");
	const [subforumNameEn, setSubforumNameEn] = useState("");
	const [subforumNameId, setSubforumNameId] = useState("");
	const [subforumDescriptionEn, setSubforumDescriptionEn] = useState("");
	const [subforumDescriptionId, setSubforumDescriptionId] = useState("");
	const [busy, setBusy] = useState<null | string>(null);
	const [error, setError] = useState<string | null>(null);

	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [editCatNameEn, setEditCatNameEn] = useState("");
	const [editCatNameId, setEditCatNameId] = useState("");
	const [editCatDescriptionEn, setEditCatDescriptionEn] = useState("");
	const [editCatDescriptionId, setEditCatDescriptionId] = useState("");

	const [editingSubforum, setEditingSubforum] = useState<string | null>(null);
	const [editSubNameEn, setEditSubNameEn] = useState("");
	const [editSubNameId, setEditSubNameId] = useState("");
	const [editSubDescriptionEn, setEditSubDescriptionEn] = useState("");
	const [editSubDescriptionId, setEditSubDescriptionId] = useState("");

	const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

	async function createCategory() {
		setBusy("category");
		setError(null);
		const payload = {
			slug: slugify(categoryNameEn),
			name_en: categoryNameEn,
			name_id: categoryNameId || categoryNameEn,
			description_en: categoryDescriptionEn.trim() || null,
			description_id: categoryDescriptionId.trim() || null,
			order_index: categories.length,
			is_visible: true,
		};
		const response = await fetch("/api/admin/forum/categories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not create category.");
			return;
		}
		window.location.reload();
	}

	async function createSubforum() {
		setBusy("subforum");
		setError(null);
		const payload = {
			category_id: subforumCategoryId,
			slug: slugify(subforumNameEn),
			name_en: subforumNameEn,
			name_id: subforumNameId || subforumNameEn,
			description_en: subforumDescriptionEn.trim() || null,
			description_id: subforumDescriptionId.trim() || null,
			order_index: subforums.filter((subforum) => subforum.category_id === subforumCategoryId).length,
			is_visible: true,
		};
		const response = await fetch("/api/admin/forum/subforums", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not create sub-forum.");
			return;
		}
		window.location.reload();
	}

	async function toggleCategoryVisibility(category: ForumCategory) {
		setBusy(`toggle-cat-${category.id}`);
		setError(null);
		const response = await fetch("/api/admin/forum/categories", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: category.id,
				slug: category.slug,
				name_en: category.name_en,
				name_id: category.name_id,
				description_en: category.description_en,
				description_id: category.description_id,
				order_index: category.order_index,
				is_visible: !category.is_visible,
			}),
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not update category.");
			return;
		}
		window.location.reload();
	}

	async function saveCategory(category: ForumCategory) {
		setBusy(`edit-cat-${category.id}`);
		setError(null);
		const response = await fetch("/api/admin/forum/categories", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: category.id,
				slug: slugify(editCatNameEn || category.name_en),
				name_en: editCatNameEn || category.name_en,
				name_id: editCatNameId || category.name_id,
				description_en: editCatDescriptionEn.trim() || null,
				description_id: editCatDescriptionId.trim() || null,
				order_index: category.order_index,
				is_visible: category.is_visible,
			}),
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not update category.");
			return;
		}
		setEditingCategory(null);
		window.location.reload();
	}

	async function deleteCategory(id: string) {
		setBusy(`del-cat-${id}`);
		setError(null);
		const response = await fetch(`/api/admin/forum/categories?id=${encodeURIComponent(id)}`, {
			method: "DELETE",
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not delete category.");
			return;
		}
		window.location.reload();
	}

	async function toggleSubforumVisibility(subforum: ForumSubforum) {
		setBusy(`toggle-sub-${subforum.id}`);
		setError(null);
		const response = await fetch("/api/admin/forum/subforums", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: subforum.id,
				category_id: subforum.category_id,
				slug: subforum.slug,
				name_en: subforum.name_en,
				name_id: subforum.name_id,
				description_en: subforum.description_en,
				description_id: subforum.description_id,
				order_index: subforum.order_index,
				is_visible: !subforum.is_visible,
			}),
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not update sub-forum.");
			return;
		}
		window.location.reload();
	}

	async function saveSubforum(subforum: ForumSubforum) {
		setBusy(`edit-sub-${subforum.id}`);
		setError(null);
		const response = await fetch("/api/admin/forum/subforums", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: subforum.id,
				category_id: subforum.category_id,
				slug: slugify(editSubNameEn || subforum.name_en),
				name_en: editSubNameEn || subforum.name_en,
				name_id: editSubNameId || subforum.name_id,
				description_en: editSubDescriptionEn.trim() || null,
				description_id: editSubDescriptionId.trim() || null,
				order_index: subforum.order_index,
				is_visible: subforum.is_visible,
			}),
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not update sub-forum.");
			return;
		}
		setEditingSubforum(null);
		window.location.reload();
	}

	async function deleteSubforum(id: string) {
		setBusy(`del-sub-${id}`);
		setError(null);
		const response = await fetch(`/api/admin/forum/subforums?id=${encodeURIComponent(id)}`, {
			method: "DELETE",
		}).catch(() => null);
		setBusy(null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not delete sub-forum.");
			return;
		}
		window.location.reload();
	}

	function startEditCategory(category: ForumCategory) {
		setEditingCategory(category.id);
		setEditCatNameEn(category.name_en);
		setEditCatNameId(category.name_id);
		setEditCatDescriptionEn(category.description_en ?? "");
		setEditCatDescriptionId(category.description_id ?? "");
	}

	function startEditSubforum(subforum: ForumSubforum) {
		setEditingSubforum(subforum.id);
		setEditSubNameEn(subforum.name_en);
		setEditSubNameId(subforum.name_id);
		setEditSubDescriptionEn(subforum.description_en ?? "");
		setEditSubDescriptionId(subforum.description_id ?? "");
	}

	return (
		<div className="space-y-6">
			<section className="grid gap-3 rounded-2xl border bg-(--surface-elevated) p-4">
				<h2 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Buat Kategori" : "Create Category"}</h2>
				<div className="grid gap-3 md:grid-cols-2">
					<div>
						<Label htmlFor="forum-category-name-en">Name (EN)</Label>
						<Input
							id="forum-category-name-en"
							value={categoryNameEn}
							onChange={(event) => setCategoryNameEn(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-category-name-id">Name (ID)</Label>
						<Input
							id="forum-category-name-id"
							value={categoryNameId}
							onChange={(event) => setCategoryNameId(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-category-description-en">Description (EN)</Label>
						<Input
							id="forum-category-description-en"
							value={categoryDescriptionEn}
							onChange={(event) => setCategoryDescriptionEn(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-category-description-id">Description (ID)</Label>
						<Input
							id="forum-category-description-id"
							value={categoryDescriptionId}
							onChange={(event) => setCategoryDescriptionId(event.currentTarget.value)}
						/>
					</div>
				</div>
				<div className="flex items-center justify-end">
					<Button type="button" onClick={() => void createCategory()} disabled={busy !== null || !categoryNameEn.trim()}>
						{busy === "category" ? "..." : locale === "id" ? "Tambah Kategori" : "Add Category"}
					</Button>
				</div>
			</section>

			<section className="grid gap-3 rounded-2xl border bg-(--surface-elevated) p-4">
				<h2 className="font-heading text-xl text-(--espresso)">
					{locale === "id" ? "Buat Sub-Forum" : "Create Sub-forum"}
				</h2>
				<div className="grid gap-3 md:grid-cols-3">
					<div>
						<Label htmlFor="forum-subforum-category">{locale === "id" ? "Kategori" : "Category"}</Label>
						<Select
							id="forum-subforum-category"
							value={subforumCategoryId}
							onChange={(event) => setSubforumCategoryId(event.currentTarget.value)}
						>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{locale === "id" ? category.name_id : category.name_en}
								</option>
							))}
						</Select>
					</div>
					<div>
						<Label htmlFor="forum-subforum-name-en">Name (EN)</Label>
						<Input
							id="forum-subforum-name-en"
							value={subforumNameEn}
							onChange={(event) => setSubforumNameEn(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-subforum-name-id">Name (ID)</Label>
						<Input
							id="forum-subforum-name-id"
							value={subforumNameId}
							onChange={(event) => setSubforumNameId(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-subforum-description-en">Description (EN)</Label>
						<Input
							id="forum-subforum-description-en"
							value={subforumDescriptionEn}
							onChange={(event) => setSubforumDescriptionEn(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="forum-subforum-description-id">Description (ID)</Label>
						<Input
							id="forum-subforum-description-id"
							value={subforumDescriptionId}
							onChange={(event) => setSubforumDescriptionId(event.currentTarget.value)}
						/>
					</div>
				</div>
				<div className="flex items-center justify-end">
					<Button type="button" onClick={() => void createSubforum()} disabled={busy !== null || !subforumNameEn.trim()}>
						{busy === "subforum" ? "..." : locale === "id" ? "Tambah Sub-Forum" : "Add Sub-forum"}
					</Button>
				</div>
			</section>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-(--espresso)">
					{locale === "id" ? "Struktur Saat Ini" : "Current Structure"}
				</h2>
				<div className="space-y-3">
					{categories.map((category) => (
						<div key={category.id} className="rounded-2xl border bg-(--surface-elevated) p-4">
							{editingCategory === category.id ? (
								<div className="grid gap-2">
									<div className="grid gap-2 md:grid-cols-2">
										<Input
											value={editCatNameEn}
											onChange={(e) => setEditCatNameEn(e.currentTarget.value)}
											placeholder="Name (EN)"
										/>
										<Input
											value={editCatNameId}
											onChange={(e) => setEditCatNameId(e.currentTarget.value)}
											placeholder="Name (ID)"
										/>
										<Input
											value={editCatDescriptionEn}
											onChange={(e) => setEditCatDescriptionEn(e.currentTarget.value)}
											placeholder="Description (EN)"
										/>
										<Input
											value={editCatDescriptionId}
											onChange={(e) => setEditCatDescriptionId(e.currentTarget.value)}
											placeholder="Description (ID)"
										/>
									</div>
									<div className="flex gap-2">
										<Button type="button" size="sm" onClick={() => void saveCategory(category)} disabled={busy !== null}>
											{locale === "id" ? "Simpan" : "Save"}
										</Button>
										<Button type="button" size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
											{locale === "id" ? "Batal" : "Cancel"}
										</Button>
									</div>
								</div>
							) : (
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div>
										<p className="font-semibold text-(--espresso)">
											{locale === "id" ? category.name_id : category.name_en}
											{!category.is_visible && (
												<span className="ml-2 text-xs text-(--muted)">({locale === "id" ? "Tersembunyi" : "Hidden"})</span>
											)}
										</p>
										{(locale === "id" ? category.description_id : category.description_en) ? (
											<p className="text-xs text-(--muted)">
												{locale === "id" ? category.description_id : category.description_en}
											</p>
										) : null}
										<p className="text-xs text-(--muted)">/{category.slug}</p>
									</div>
									<div className="flex items-center gap-1">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => void toggleCategoryVisibility(category)}
											disabled={busy !== null}
											title={
												category.is_visible ? (locale === "id" ? "Sembunyikan" : "Hide") : locale === "id" ? "Tampilkan" : "Show"
											}
										>
											{category.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => startEditCategory(category)}
											disabled={busy !== null}
											title={locale === "id" ? "Edit" : "Edit"}
										>
											<Pencil size={14} />
										</Button>
										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => void deleteCategory(category.id)}
											disabled={busy !== null}
											title={locale === "id" ? "Hapus" : "Delete"}
										>
											<Trash2 size={14} />
										</Button>
									</div>
								</div>
							)}
							<div className="mt-2 grid gap-2">
								{subforums
									.filter((subforum) => subforum.category_id === category.id)
									.map((subforum) => (
										<div key={subforum.id} className="rounded-xl border bg-(--surface) px-3 py-2 text-sm">
											{editingSubforum === subforum.id ? (
												<div className="grid gap-2">
													<div className="grid gap-2 md:grid-cols-2">
														<Input
															value={editSubNameEn}
															onChange={(e) => setEditSubNameEn(e.currentTarget.value)}
															placeholder="Name (EN)"
														/>
														<Input
															value={editSubNameId}
															onChange={(e) => setEditSubNameId(e.currentTarget.value)}
															placeholder="Name (ID)"
														/>
														<Input
															value={editSubDescriptionEn}
															onChange={(e) => setEditSubDescriptionEn(e.currentTarget.value)}
															placeholder="Description (EN)"
														/>
														<Input
															value={editSubDescriptionId}
															onChange={(e) => setEditSubDescriptionId(e.currentTarget.value)}
															placeholder="Description (ID)"
														/>
													</div>
													<div className="flex gap-2">
														<Button type="button" size="sm" onClick={() => void saveSubforum(subforum)} disabled={busy !== null}>
															{locale === "id" ? "Simpan" : "Save"}
														</Button>
														<Button type="button" size="sm" variant="ghost" onClick={() => setEditingSubforum(null)}>
															{locale === "id" ? "Batal" : "Cancel"}
														</Button>
													</div>
												</div>
											) : (
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div>
														<p className="font-medium text-(--espresso)">
															{locale === "id" ? subforum.name_id : subforum.name_en}
															{!subforum.is_visible && (
																<span className="ml-2 text-xs text-(--muted)">({locale === "id" ? "Tersembunyi" : "Hidden"})</span>
															)}
														</p>
														{(locale === "id" ? subforum.description_id : subforum.description_en) ? (
															<p className="text-xs text-(--muted)">
																{locale === "id" ? subforum.description_id : subforum.description_en}
															</p>
														) : null}
														<p className="text-xs text-(--muted)">
															/{category.slug}/f/{subforum.slug} · {categoryMap.get(subforum.category_id)?.slug}
														</p>
													</div>
													<div className="flex items-center gap-1">
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => void toggleSubforumVisibility(subforum)}
															disabled={busy !== null}
															title={
																subforum.is_visible
																	? locale === "id"
																		? "Sembunyikan"
																		: "Hide"
																	: locale === "id"
																		? "Tampilkan"
																		: "Show"
															}
														>
															{subforum.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => startEditSubforum(subforum)}
															disabled={busy !== null}
															title={locale === "id" ? "Edit" : "Edit"}
														>
															<Pencil size={14} />
														</Button>
														<Button
															type="button"
															variant="destructive"
															size="sm"
															onClick={() => void deleteSubforum(subforum.id)}
															disabled={busy !== null}
															title={locale === "id" ? "Hapus" : "Delete"}
														>
															<Trash2 size={14} />
														</Button>
													</div>
												</div>
											)}
										</div>
									))}
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
