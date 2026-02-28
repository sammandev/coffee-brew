"use client";

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
	const [subforumCategoryId, setSubforumCategoryId] = useState(categories[0]?.id ?? "");
	const [subforumNameEn, setSubforumNameEn] = useState("");
	const [subforumNameId, setSubforumNameId] = useState("");
	const [busy, setBusy] = useState<null | "category" | "subforum">(null);
	const [error, setError] = useState<string | null>(null);

	const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

	async function createCategory() {
		setBusy("category");
		setError(null);
		const payload = {
			slug: slugify(categoryNameEn),
			name_en: categoryNameEn,
			name_id: categoryNameId || categoryNameEn,
			description_en: null,
			description_id: null,
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
			description_en: null,
			description_id: null,
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
							<p className="font-semibold text-(--espresso)">{locale === "id" ? category.name_id : category.name_en}</p>
							<p className="text-xs text-(--muted)">/{category.slug}</p>
							<div className="mt-2 grid gap-2">
								{subforums
									.filter((subforum) => subforum.category_id === category.id)
									.map((subforum) => (
										<div key={subforum.id} className="rounded-xl border bg-(--surface) px-3 py-2 text-sm">
											<p className="font-medium text-(--espresso)">{locale === "id" ? subforum.name_id : subforum.name_en}</p>
											<p className="text-xs text-(--muted)">
												/{category.slug}/f/{subforum.slug} · {categoryMap.get(subforum.category_id)?.slug}
											</p>
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
