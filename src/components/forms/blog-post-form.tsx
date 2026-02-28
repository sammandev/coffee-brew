"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import type { BlogPostRecord } from "@/lib/types";

interface BlogPostFormProps {
	formId: string;
	mode: "create" | "edit";
	onSaved?: () => void;
	onSubmittingChange?: (submitting: boolean) => void;
	post?: BlogPostRecord | null;
}

function toTagString(tags: string[] | null | undefined) {
	return Array.isArray(tags) ? tags.join(", ") : "";
}

export function BlogPostForm({ formId, mode, onSaved, onSubmittingChange, post }: BlogPostFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [form, setForm] = useState({
		slug: post?.slug ?? "",
		title_en: post?.title_en ?? "",
		title_id: post?.title_id ?? "",
		excerpt_en: post?.excerpt_en ?? "",
		excerpt_id: post?.excerpt_id ?? "",
		body_en: post?.body_en ?? "",
		body_id: post?.body_id ?? "",
		hero_image_url:
			post?.hero_image_url ??
			"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80",
		hero_image_alt_en: post?.hero_image_alt_en ?? "Coffee blog hero image",
		hero_image_alt_id: post?.hero_image_alt_id ?? "Gambar utama blog kopi",
		tags: toTagString(post?.tags),
		reading_time_minutes: String(post?.reading_time_minutes ?? 4),
		status: post?.status ?? "draft",
	});

	useEffect(() => {
		onSubmittingChange?.(isSubmitting);
	}, [isSubmitting, onSubmittingChange]);

	function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function parseTags() {
		return form.tags
			.split(",")
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index);
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSuccess(null);
		setIsSubmitting(true);

		const payload = {
			slug: form.slug.trim(),
			title_en: form.title_en.trim(),
			title_id: form.title_id.trim(),
			excerpt_en: form.excerpt_en.trim(),
			excerpt_id: form.excerpt_id.trim(),
			body_en: form.body_en.trim(),
			body_id: form.body_id.trim(),
			hero_image_url: form.hero_image_url.trim(),
			hero_image_alt_en: form.hero_image_alt_en.trim(),
			hero_image_alt_id: form.hero_image_alt_id.trim(),
			tags: parseTags(),
			reading_time_minutes: Number(form.reading_time_minutes),
			status: form.status,
			published_at: form.status === "published" ? new Date().toISOString() : null,
		};

		const endpoint = mode === "create" ? "/api/admin/blog" : `/api/admin/blog/${post?.id}`;
		const method = mode === "create" ? "POST" : "PUT";

		const response = await fetch(endpoint, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menyimpan blog." : "Could not save blog post."));
			setIsSubmitting(false);
			return;
		}

		setSuccess(locale === "id" ? "Blog berhasil disimpan." : "Blog post saved.");
		setIsSubmitting(false);

		if (onSaved) {
			onSaved();
			return;
		}

		router.push("/dashboard/blog");
		router.refresh();
	}

	return (
		<form id={formId} onSubmit={onSubmit} className="grid gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor={`${formId}-slug`}>Slug</Label>
					<Input
						id={`${formId}-slug`}
						value={form.slug}
						onChange={(event) => update("slug", event.currentTarget.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor={`${formId}-status`}>Status</Label>
					<Select
						id={`${formId}-status`}
						value={form.status}
						onChange={(event) => update("status", event.currentTarget.value as "draft" | "published" | "hidden")}
					>
						<option value="draft">Draft</option>
						<option value="published">Published</option>
						<option value="hidden">Hidden</option>
					</Select>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor={`${formId}-title-en`}>Title (EN)</Label>
					<Input
						id={`${formId}-title-en`}
						value={form.title_en}
						onChange={(event) => update("title_en", event.currentTarget.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor={`${formId}-title-id`}>Title (ID)</Label>
					<Input
						id={`${formId}-title-id`}
						value={form.title_id}
						onChange={(event) => update("title_id", event.currentTarget.value)}
						required
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor={`${formId}-excerpt-en`}>Excerpt (EN)</Label>
					<RichTextEditor
						id={`${formId}-excerpt-en`}
						value={form.excerpt_en}
						onChange={(nextValue) => update("excerpt_en", nextValue)}
						minPlainTextLength={3}
						maxPlainTextLength={600}
					/>
				</div>
				<div>
					<Label htmlFor={`${formId}-excerpt-id`}>Excerpt (ID)</Label>
					<RichTextEditor
						id={`${formId}-excerpt-id`}
						value={form.excerpt_id}
						onChange={(nextValue) => update("excerpt_id", nextValue)}
						minPlainTextLength={3}
						maxPlainTextLength={600}
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor={`${formId}-body-en`}>Body (EN)</Label>
					<RichTextEditor
						id={`${formId}-body-en`}
						value={form.body_en}
						onChange={(nextValue) => update("body_en", nextValue)}
						minPlainTextLength={10}
						maxPlainTextLength={50000}
					/>
				</div>
				<div>
					<Label htmlFor={`${formId}-body-id`}>Body (ID)</Label>
					<RichTextEditor
						id={`${formId}-body-id`}
						value={form.body_id}
						onChange={(nextValue) => update("body_id", nextValue)}
						minPlainTextLength={10}
						maxPlainTextLength={50000}
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor={`${formId}-hero-image`}>Hero Image URL (Unsplash)</Label>
					<Input
						id={`${formId}-hero-image`}
						value={form.hero_image_url}
						onChange={(event) => update("hero_image_url", event.currentTarget.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor={`${formId}-tags`}>Tags</Label>
					<Input
						id={`${formId}-tags`}
						value={form.tags}
						onChange={(event) => update("tags", event.currentTarget.value)}
						placeholder="espresso, v60, roasting"
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div>
					<Label htmlFor={`${formId}-hero-alt-en`}>Image Alt (EN)</Label>
					<Input
						id={`${formId}-hero-alt-en`}
						value={form.hero_image_alt_en}
						onChange={(event) => update("hero_image_alt_en", event.currentTarget.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor={`${formId}-hero-alt-id`}>Image Alt (ID)</Label>
					<Input
						id={`${formId}-hero-alt-id`}
						value={form.hero_image_alt_id}
						onChange={(event) => update("hero_image_alt_id", event.currentTarget.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor={`${formId}-reading-time`}>Reading Time (minutes)</Label>
					<Input
						id={`${formId}-reading-time`}
						type="number"
						min={1}
						value={form.reading_time_minutes}
						onChange={(event) => update("reading_time_minutes", event.currentTarget.value)}
						required
					/>
				</div>
			</div>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
			{success ? <p className="text-sm text-(--accent)">{success}</p> : null}
		</form>
	);
}
