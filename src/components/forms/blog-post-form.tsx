"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { DEFAULT_BLOG_IMAGE_URL, isManagedBlogImageUrl, resolveBlogImageUrl } from "@/lib/blog-images";
import type { BlogPostRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BlogPostFormProps {
	formId: string;
	mode: "create" | "edit";
	onSaved?: () => void;
	onSubmittingChange?: (submitting: boolean) => void;
	post?: BlogPostRecord | null;
}

type HeroImageMode = "upload" | "url";

function toTagString(tags: string[] | null | undefined) {
	return Array.isArray(tags) ? tags.join(", ") : "";
}

function resolveDefaultHeroMode(url: string) {
	if (!url) return "url" as const;
	return isManagedBlogImageUrl(url) ? ("upload" as const) : ("url" as const);
}

function isValidImageUrl(value: string) {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function buildInitialForm(post?: BlogPostRecord | null) {
	return {
		slug: post?.slug ?? "",
		title_en: post?.title_en ?? "",
		title_id: post?.title_id ?? "",
		excerpt_en: post?.excerpt_en ?? "",
		excerpt_id: post?.excerpt_id ?? "",
		body_en: post?.body_en ?? "",
		body_id: post?.body_id ?? "",
		hero_image_alt_en: post?.hero_image_alt_en ?? "Coffee blog hero image",
		hero_image_alt_id: post?.hero_image_alt_id ?? "Gambar utama blog kopi",
		tags: toTagString(post?.tags),
		reading_time_minutes: String(post?.reading_time_minutes ?? 4),
		status: post?.status ?? "draft",
	};
}

export function BlogPostForm({ formId, mode, onSaved, onSubmittingChange, post }: BlogPostFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [imageError, setImageError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [form, setForm] = useState(() => buildInitialForm(post));

	const initialHeroUrl = post?.hero_image_url ?? DEFAULT_BLOG_IMAGE_URL;
	const initialMode = useMemo(() => resolveDefaultHeroMode(initialHeroUrl), [initialHeroUrl]);
	const [heroImageMode, setHeroImageMode] = useState<HeroImageMode>(initialMode);
	const [heroImageUrlInput, setHeroImageUrlInput] = useState(initialMode === "url" ? initialHeroUrl : "");
	const [uploadedHeroImageUrl, setUploadedHeroImageUrl] = useState(initialMode === "upload" ? initialHeroUrl : "");

	useEffect(() => {
		onSubmittingChange?.(isSubmitting);
	}, [isSubmitting, onSubmittingChange]);

	useEffect(() => {
		const nextInitialForm = buildInitialForm(post);
		const nextHeroUrl = post?.hero_image_url ?? DEFAULT_BLOG_IMAGE_URL;
		const nextMode = resolveDefaultHeroMode(nextHeroUrl);

		setForm(nextInitialForm);
		setHeroImageMode(nextMode);
		setHeroImageUrlInput(nextMode === "url" ? nextHeroUrl : "");
		setUploadedHeroImageUrl(nextMode === "upload" ? nextHeroUrl : "");
		setImageError(null);
		setError(null);
		setSuccess(null);
	}, [post]);

	function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function parseTags() {
		return form.tags
			.split(",")
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)
			.slice(0, 12);
	}

	async function onUploadImage(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";

		if (!file) return;

		setIsUploadingImage(true);
		setImageError(null);
		setError(null);

		const uploadPayload = new FormData();
		uploadPayload.append("file", file);

		const response = await fetch("/api/admin/blog/image", {
			method: "POST",
			body: uploadPayload,
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setImageError(
				body?.error ??
					(locale === "id" ? "Gagal mengunggah gambar. Coba lagi." : "Could not upload image. Please try again."),
			);
			setIsUploadingImage(false);
			return;
		}

		const body = (await response.json().catch(() => ({}))) as { image_url?: string };
		if (!body.image_url) {
			setImageError(locale === "id" ? "Respons upload tidak valid." : "Invalid upload response.");
			setIsUploadingImage(false);
			return;
		}

		setUploadedHeroImageUrl(body.image_url);
		setHeroImageMode("upload");
		setHeroImageUrlInput("");
		setIsUploadingImage(false);
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setImageError(null);
		setSuccess(null);
		setIsSubmitting(true);

		const selectedUpload = uploadedHeroImageUrl.trim();
		const selectedUrl = heroImageUrlInput.trim();
		const usingUpload = heroImageMode === "upload";
		const usingUrl = heroImageMode === "url";
		const selectedImageUrl = usingUpload ? selectedUpload : selectedUrl;

		if ((usingUpload && selectedUpload.length === 0) || (usingUrl && selectedUrl.length === 0)) {
			setError(
				locale === "id"
					? "Pilih tepat satu sumber gambar hero: upload atau URL."
					: "Choose exactly one hero image source: upload or URL.",
			);
			setIsSubmitting(false);
			return;
		}

		if (usingUpload && selectedUrl.length > 0) {
			setError(
				locale === "id"
					? "Mode upload hanya boleh menggunakan file hasil unggah."
					: "Upload mode can only use the uploaded file source.",
			);
			setIsSubmitting(false);
			return;
		}

		if (usingUrl && selectedUpload.length > 0) {
			setError(
				locale === "id"
					? "Mode URL hanya boleh menggunakan URL eksternal."
					: "URL mode can only use the external URL source.",
			);
			setIsSubmitting(false);
			return;
		}

		if (usingUrl && !isValidImageUrl(selectedUrl)) {
			setError(locale === "id" ? "URL gambar tidak valid." : "Image URL is invalid.");
			setIsSubmitting(false);
			return;
		}

		const payload = {
			slug: form.slug.trim(),
			title_en: form.title_en.trim(),
			title_id: form.title_id.trim(),
			excerpt_en: form.excerpt_en.trim(),
			excerpt_id: form.excerpt_id.trim(),
			body_en: form.body_en.trim(),
			body_id: form.body_id.trim(),
			hero_image_url: selectedImageUrl,
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

	const selectedImageUrl = (heroImageMode === "upload" ? uploadedHeroImageUrl : heroImageUrlInput).trim();
	const imagePreviewUrl = resolveBlogImageUrl(selectedImageUrl);
	const hasCustomImage = selectedImageUrl.length > 0;

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

			<section className="space-y-3 rounded-2xl border bg-(--surface) p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="font-heading text-xl text-(--espresso)">Blog Hero Image</h3>
						<p className="text-xs text-(--muted)">
							{locale === "id"
								? "Pilih tepat satu sumber: unggah gambar atau masukkan URL (contoh: Unsplash)."
								: "Choose exactly one source: upload an image or use an external URL (for example, Unsplash)."}
						</p>
					</div>
					<div className="inline-flex rounded-lg border bg-(--surface-elevated) p-1">
						<button
							type="button"
							onClick={() => {
								setHeroImageMode("upload");
								setHeroImageUrlInput("");
							}}
							className={cn(
								"rounded-md px-3 py-1.5 text-sm font-semibold",
								heroImageMode === "upload" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)",
							)}
						>
							{locale === "id" ? "Upload" : "Upload"}
						</button>
						<button
							type="button"
							onClick={() => {
								setHeroImageMode("url");
								setUploadedHeroImageUrl("");
							}}
							className={cn(
								"rounded-md px-3 py-1.5 text-sm font-semibold",
								heroImageMode === "url" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)",
							)}
						>
							URL
						</button>
					</div>
				</div>

				{heroImageMode === "upload" ? (
					<div className="space-y-2">
						<label className="inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/15">
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onChange={onUploadImage}
								disabled={isUploadingImage || isSubmitting}
								className="hidden"
							/>
							{isUploadingImage
								? locale === "id"
									? "Mengunggah..."
									: "Uploading..."
								: locale === "id"
									? "Unggah Gambar"
									: "Upload Image"}
						</label>
						<p className="text-xs text-(--muted)">
							{locale === "id" ? "Format JPG/PNG/WEBP, maks 5MB." : "JPG/PNG/WEBP up to 5MB."}
						</p>
					</div>
				) : (
					<div className="space-y-2">
						<Label htmlFor={`${formId}-hero-image-url`}>Hero Image URL (Unsplash)</Label>
						<Input
							id={`${formId}-hero-image-url`}
							value={heroImageUrlInput}
							onChange={(event) => setHeroImageUrlInput(event.currentTarget.value)}
							placeholder={DEFAULT_BLOG_IMAGE_URL}
						/>
					</div>
				)}

				<div className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-(--surface-elevated)">
					<Image
						src={imagePreviewUrl}
						alt={form.hero_image_alt_en || form.title_en || "Blog hero image"}
						fill
						sizes="(max-width: 768px) 100vw, 1100px"
						className="object-cover"
					/>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-xs text-(--muted)">
						{hasCustomImage
							? locale === "id"
								? "Pratinjau hero image blog."
								: "Blog hero image preview."
							: locale === "id"
								? "Belum ada gambar khusus, memakai fallback Unsplash."
								: "No custom image yet, using Unsplash fallback."}
					</p>
					{hasCustomImage ? (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => {
								if (heroImageMode === "upload") {
									setUploadedHeroImageUrl("");
								} else {
									setHeroImageUrlInput("");
								}
							}}
						>
							{locale === "id" ? "Hapus Gambar" : "Clear Image"}
						</Button>
					) : null}
				</div>

				{imageError ? <p className="text-sm text-(--danger)">{imageError}</p> : null}
			</section>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor={`${formId}-tags`}>Tags</Label>
					<Input
						id={`${formId}-tags`}
						value={form.tags}
						onChange={(event) => update("tags", event.currentTarget.value)}
						placeholder="espresso, v60, roasting"
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

			<div className="grid gap-4 md:grid-cols-2">
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
			</div>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
			{success ? <p className="text-sm text-(--accent)">{success}</p> : null}
		</form>
	);
}
