"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteModal } from "@/components/ui/delete-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { DEFAULT_BREW_IMAGE_URL, isManagedBrewImageUrl, resolveBrewImageUrl } from "@/lib/brew-images";
import type { BrewRecommendedMethod, BrewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BrewFormProps {
	mode: "create" | "edit";
	brewId?: string;
	redirectPath?: string;
	initialValues?: {
		name?: string;
		brew_method?: string;
		coffee_beans?: string;
		brand_roastery?: string;
		water_type?: string;
		water_ppm?: number;
		temperature?: number;
		temperature_unit?: "C" | "F";
		grind_size?: string;
		grind_clicks?: number | null;
		brew_time_seconds?: number;
		brewer_name?: string;
		notes?: string;
		image_url?: string | null;
		image_alt?: string | null;
		grind_reference_image_url?: string | null;
		grind_reference_image_alt?: string | null;
		bean_process?: string | null;
		recommended_methods?: string[] | null;
		tags?: string[] | null;
		status?: BrewStatus;
	};
}

type ImageMode = "upload" | "url";
const RECOMMENDED_METHOD_VALUES: BrewRecommendedMethod[] = ["espresso", "cold_brew", "pour_over"];

function toTagInput(tags: string[] | null | undefined) {
	if (!Array.isArray(tags)) return "";
	return tags.join(", ");
}

function resolveDefaultImageMode(imageUrl: string) {
	if (!imageUrl) return "url" as const;
	return isManagedBrewImageUrl(imageUrl) ? ("upload" as const) : ("url" as const);
}

function isValidImageUrl(value: string) {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function normalizeRecommendedMethods(raw: string[] | null | undefined): BrewRecommendedMethod[] {
	if (!Array.isArray(raw)) return [];
	const normalized: BrewRecommendedMethod[] = [];
	for (const entry of raw) {
		const value = String(entry).trim().toLowerCase() as BrewRecommendedMethod;
		if (!RECOMMENDED_METHOD_VALUES.includes(value)) continue;
		if (normalized.includes(value)) continue;
		normalized.push(value);
	}
	return normalized;
}

export function BrewForm({ mode, brewId, redirectPath = "/me", initialValues }: BrewFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [isUploadingGrindReferenceImage, setIsUploadingGrindReferenceImage] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [imageError, setImageError] = useState<string | null>(null);
	const [grindReferenceImageError, setGrindReferenceImageError] = useState<string | null>(null);

	const defaults = useMemo(
		() => ({
			name: initialValues?.name ?? "",
			brewMethod: initialValues?.brew_method ?? "Pour Over",
			coffeeBeans: initialValues?.coffee_beans ?? "",
			brandRoastery: initialValues?.brand_roastery ?? "",
			waterType: initialValues?.water_type ?? "Filtered",
			waterPpm: initialValues?.water_ppm ?? 120,
			temperature: initialValues?.temperature ?? 93,
			temperatureUnit: initialValues?.temperature_unit ?? "C",
			grindSize: initialValues?.grind_size ?? "Medium",
			grindClicks: initialValues?.grind_clicks ?? "",
			brewTimeSeconds: initialValues?.brew_time_seconds ?? 180,
			brewerName: initialValues?.brewer_name ?? "",
			notes: initialValues?.notes ?? "",
			imageUrl: initialValues?.image_url?.trim() ?? "",
			imageAlt: initialValues?.image_alt?.trim() ?? "",
			grindReferenceImageUrl: initialValues?.grind_reference_image_url?.trim() ?? "",
			grindReferenceImageAlt: initialValues?.grind_reference_image_alt?.trim() ?? "",
			beanProcess: initialValues?.bean_process?.trim() ?? "",
			recommendedMethods: normalizeRecommendedMethods(initialValues?.recommended_methods),
			tags: toTagInput(initialValues?.tags),
			status: initialValues?.status ?? "draft",
		}),
		[initialValues],
	);

	const [notes, setNotes] = useState(defaults.notes);
	const [imageAlt, setImageAlt] = useState(defaults.imageAlt);
	const [grindReferenceImageAlt, setGrindReferenceImageAlt] = useState(defaults.grindReferenceImageAlt);
	const [beanProcess, setBeanProcess] = useState(defaults.beanProcess);
	const [recommendedMethods, setRecommendedMethods] = useState<BrewRecommendedMethod[]>(defaults.recommendedMethods);
	const [imageMode, setImageMode] = useState<ImageMode>(resolveDefaultImageMode(defaults.imageUrl));
	const [imageUrlInput, setImageUrlInput] = useState(
		resolveDefaultImageMode(defaults.imageUrl) === "url" ? defaults.imageUrl : "",
	);
	const [uploadedImageUrl, setUploadedImageUrl] = useState(
		resolveDefaultImageMode(defaults.imageUrl) === "upload" ? defaults.imageUrl : "",
	);
	const [grindReferenceImageMode, setGrindReferenceImageMode] = useState<ImageMode>(
		resolveDefaultImageMode(defaults.grindReferenceImageUrl),
	);
	const [grindReferenceImageUrlInput, setGrindReferenceImageUrlInput] = useState(
		resolveDefaultImageMode(defaults.grindReferenceImageUrl) === "url" ? defaults.grindReferenceImageUrl : "",
	);
	const [uploadedGrindReferenceImageUrl, setUploadedGrindReferenceImageUrl] = useState(
		resolveDefaultImageMode(defaults.grindReferenceImageUrl) === "upload" ? defaults.grindReferenceImageUrl : "",
	);
	const [tagsInput, setTagsInput] = useState(defaults.tags);

	useEffect(() => {
		const nextMode = resolveDefaultImageMode(defaults.imageUrl);
		const nextGrindReferenceMode = resolveDefaultImageMode(defaults.grindReferenceImageUrl);
		setNotes(defaults.notes);
		setImageAlt(defaults.imageAlt);
		setGrindReferenceImageAlt(defaults.grindReferenceImageAlt);
		setBeanProcess(defaults.beanProcess);
		setRecommendedMethods(defaults.recommendedMethods);
		setImageMode(nextMode);
		setImageUrlInput(nextMode === "url" ? defaults.imageUrl : "");
		setUploadedImageUrl(nextMode === "upload" ? defaults.imageUrl : "");
		setGrindReferenceImageMode(nextGrindReferenceMode);
		setGrindReferenceImageUrlInput(nextGrindReferenceMode === "url" ? defaults.grindReferenceImageUrl : "");
		setUploadedGrindReferenceImageUrl(nextGrindReferenceMode === "upload" ? defaults.grindReferenceImageUrl : "");
		setTagsInput(defaults.tags);
	}, [
		defaults.beanProcess,
		defaults.grindReferenceImageAlt,
		defaults.grindReferenceImageUrl,
		defaults.imageAlt,
		defaults.imageUrl,
		defaults.notes,
		defaults.recommendedMethods,
		defaults.tags,
	]);

	const selectedImageUrl = imageMode === "upload" ? uploadedImageUrl.trim() : imageUrlInput.trim();
	const imagePreviewUrl = resolveBrewImageUrl(selectedImageUrl || null);
	const hasCustomImage = selectedImageUrl.length > 0;
	const selectedGrindReferenceImageUrl =
		grindReferenceImageMode === "upload" ? uploadedGrindReferenceImageUrl.trim() : grindReferenceImageUrlInput.trim();
	const grindReferenceImagePreviewUrl = resolveBrewImageUrl(selectedGrindReferenceImageUrl || null);
	const hasCustomGrindReferenceImage = selectedGrindReferenceImageUrl.length > 0;

	async function uploadImageFile(file: File, kind: "primary" | "grind_reference") {
		const formData = new FormData();
		formData.append("file", file);
		formData.append("kind", kind);

		return fetch("/api/brews/image", {
			method: "POST",
			body: formData,
		}).catch(() => null);
	}

	async function onUploadImage(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;

		setIsUploadingImage(true);
		setImageError(null);
		setError(null);

		const response = await uploadImageFile(file, "primary");
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

		setUploadedImageUrl(body.image_url);
		setImageMode("upload");
		setIsUploadingImage(false);
	}

	async function onUploadGrindReferenceImage(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;

		setIsUploadingGrindReferenceImage(true);
		setGrindReferenceImageError(null);
		setError(null);

		const response = await uploadImageFile(file, "grind_reference");
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setGrindReferenceImageError(
				body?.error ??
					(locale === "id" ? "Gagal mengunggah gambar referensi grind." : "Could not upload grind reference image."),
			);
			setIsUploadingGrindReferenceImage(false);
			return;
		}

		const body = (await response.json().catch(() => ({}))) as { image_url?: string };
		if (!body.image_url) {
			setGrindReferenceImageError(locale === "id" ? "Respons upload tidak valid." : "Invalid upload response.");
			setIsUploadingGrindReferenceImage(false);
			return;
		}

		setUploadedGrindReferenceImageUrl(body.image_url);
		setGrindReferenceImageMode("upload");
		setIsUploadingGrindReferenceImage(false);
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setError(null);
		setImageError(null);
		setGrindReferenceImageError(null);

		const formData = new FormData(event.currentTarget);
		const normalizedImageUrl = selectedImageUrl.trim();
		const normalizedImageAlt = imageAlt.trim();
		const normalizedGrindReferenceImageUrl = selectedGrindReferenceImageUrl.trim();
		const normalizedGrindReferenceImageAlt = grindReferenceImageAlt.trim();
		const tags = tagsInput
			.split(",")
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index)
			.slice(0, 10);

		if (imageMode === "upload" && !normalizedImageUrl) {
			setError(
				locale === "id"
					? "Unggah gambar terlebih dahulu atau pilih mode URL."
					: "Upload an image first or switch to URL mode.",
			);
			setIsSubmitting(false);
			return;
		}

		if (imageMode === "url" && normalizedImageUrl.length > 0 && !isValidImageUrl(normalizedImageUrl)) {
			setError(locale === "id" ? "URL gambar tidak valid." : "Image URL is invalid.");
			setIsSubmitting(false);
			return;
		}
		if (grindReferenceImageMode === "upload" && !normalizedGrindReferenceImageUrl) {
			setError(
				locale === "id"
					? "Unggah gambar referensi grind terlebih dahulu atau pilih mode URL."
					: "Upload a grind reference image first or switch to URL mode.",
			);
			setIsSubmitting(false);
			return;
		}
		if (
			grindReferenceImageMode === "url" &&
			normalizedGrindReferenceImageUrl.length > 0 &&
			!isValidImageUrl(normalizedGrindReferenceImageUrl)
		) {
			setError(locale === "id" ? "URL referensi grind tidak valid." : "Grind reference URL is invalid.");
			setIsSubmitting(false);
			return;
		}

		const payload = {
			name: String(formData.get("name") ?? ""),
			brewMethod: String(formData.get("brewMethod") ?? ""),
			beanProcess: beanProcess.trim().length > 0 ? beanProcess.trim() : null,
			coffeeBeans: String(formData.get("coffeeBeans") ?? ""),
			brandRoastery: String(formData.get("brandRoastery") ?? ""),
			waterType: String(formData.get("waterType") ?? ""),
			waterPpm: Number(formData.get("waterPpm") ?? 0),
			temperature: Number(formData.get("temperature") ?? 0),
			temperatureUnit: String(formData.get("temperatureUnit") ?? "C"),
			grindSize: String(formData.get("grindSize") ?? ""),
			grindClicks: formData.get("grindClicks") ? Number(formData.get("grindClicks")) : null,
			brewTimeSeconds: Number(formData.get("brewTimeSeconds") ?? 0),
			brewerName: String(formData.get("brewerName") ?? ""),
			notes: String(formData.get("notes") ?? ""),
			imageUrl: normalizedImageUrl.length > 0 ? normalizedImageUrl : null,
			imageAlt: normalizedImageUrl.length > 0 && normalizedImageAlt.length > 0 ? normalizedImageAlt : null,
			grindReferenceImageUrl: normalizedGrindReferenceImageUrl.length > 0 ? normalizedGrindReferenceImageUrl : null,
			grindReferenceImageAlt:
				normalizedGrindReferenceImageUrl.length > 0 && normalizedGrindReferenceImageAlt.length > 0
					? normalizedGrindReferenceImageAlt
					: null,
			recommendedMethods,
			tags,
			status: String(formData.get("status") ?? "draft"),
		};

		const response = await fetch(mode === "create" ? "/api/brews" : `/api/brews/${brewId}`, {
			method: mode === "create" ? "POST" : "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Tidak dapat menyimpan racikan." : "Unable to save brew."));
			setIsSubmitting(false);
			return;
		}

		router.push(redirectPath);
		router.refresh();
	}

	async function onDeleteBrew() {
		if (mode !== "edit" || !brewId) return;

		setIsDeleting(true);
		setError(null);

		const response = await fetch(`/api/brews/${brewId}`, { method: "DELETE" }).catch(() => null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Tidak dapat menghapus racikan." : "Unable to delete brew."));
			setIsDeleting(false);
			setDeleteOpen(false);
			return;
		}

		router.push(redirectPath);
		router.refresh();
	}

	return (
		<>
			<form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-6">
				<div className="grid gap-2">
					<Label htmlFor="name">{locale === "id" ? "Nama Racikan" : "Brew Name"}</Label>
					<Input id="name" name="name" defaultValue={defaults.name} required />
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="brewMethod">{locale === "id" ? "Metode Seduh" : "Brew Method"}</Label>
						<Input id="brewMethod" name="brewMethod" defaultValue={defaults.brewMethod} required />
					</div>
					<div>
						<Label htmlFor="brewerName">{locale === "id" ? "Nama Brewer" : "Brewer Name"}</Label>
						<Input id="brewerName" name="brewerName" defaultValue={defaults.brewerName} required />
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="beanProcess">{locale === "id" ? "Proses Bean (Opsional)" : "Bean Process (Optional)"}</Label>
						<Input
							id="beanProcess"
							name="beanProcess"
							value={beanProcess}
							onChange={(event) => setBeanProcess(event.currentTarget.value)}
							placeholder={locale === "id" ? "washed, natural, honey, anaerobic..." : "washed, natural, honey, anaerobic..."}
							maxLength={120}
						/>
					</div>
					<div className="space-y-2">
						<Label>{locale === "id" ? "Rekomendasi Metode" : "Method Recommendations"}</Label>
						<div className="grid gap-2">
							<div className="inline-flex items-center gap-2 text-sm">
								<Checkbox
									id="recommended-espresso"
									checked={recommendedMethods.includes("espresso")}
									onChange={(event) => {
										setRecommendedMethods((current) => {
											if (event.currentTarget.checked) {
												return Array.from(new Set([...current, "espresso"]));
											}
											return current.filter((value) => value !== "espresso");
										});
									}}
								/>
								<Label htmlFor="recommended-espresso" className="font-medium">
									{locale === "id" ? "Cocok untuk Espresso" : "Best for Espresso"}
								</Label>
							</div>
							<div className="inline-flex items-center gap-2 text-sm">
								<Checkbox
									id="recommended-cold-brew"
									checked={recommendedMethods.includes("cold_brew")}
									onChange={(event) => {
										setRecommendedMethods((current) => {
											if (event.currentTarget.checked) {
												return Array.from(new Set([...current, "cold_brew"]));
											}
											return current.filter((value) => value !== "cold_brew");
										});
									}}
								/>
								<Label htmlFor="recommended-cold-brew" className="font-medium">
									{locale === "id" ? "Bagus untuk Cold Brew" : "Great for Cold Brew"}
								</Label>
							</div>
							<div className="inline-flex items-center gap-2 text-sm">
								<Checkbox
									id="recommended-pour-over"
									checked={recommendedMethods.includes("pour_over")}
									onChange={(event) => {
										setRecommendedMethods((current) => {
											if (event.currentTarget.checked) {
												return Array.from(new Set([...current, "pour_over"]));
											}
											return current.filter((value) => value !== "pour_over");
										});
									}}
								/>
								<Label htmlFor="recommended-pour-over" className="font-medium">
									{locale === "id" ? "Optimal untuk Pour-Over" : "Optimized for Pour-Over"}
								</Label>
							</div>
						</div>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="coffeeBeans">{locale === "id" ? "Biji Kopi" : "Coffee Beans"}</Label>
						<Input id="coffeeBeans" name="coffeeBeans" defaultValue={defaults.coffeeBeans} required />
					</div>
					<div>
						<Label htmlFor="brandRoastery">{locale === "id" ? "Merek / Roastery" : "Brand / Roastery"}</Label>
						<Input id="brandRoastery" name="brandRoastery" defaultValue={defaults.brandRoastery} required />
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div>
						<Label htmlFor="waterType">{locale === "id" ? "Jenis Air" : "Water Type"}</Label>
						<Input id="waterType" name="waterType" defaultValue={defaults.waterType} required />
					</div>
					<div>
						<Label htmlFor="waterPpm">Water PPM</Label>
						<Input id="waterPpm" name="waterPpm" type="number" defaultValue={defaults.waterPpm} required />
					</div>
					<div>
						<Label htmlFor="temperature">{locale === "id" ? "Suhu" : "Temperature"}</Label>
						<Input
							id="temperature"
							name="temperature"
							type="number"
							step="0.1"
							defaultValue={defaults.temperature}
							required
						/>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div>
						<Label htmlFor="temperatureUnit">{locale === "id" ? "Unit Suhu" : "Temp Unit"}</Label>
						<Select id="temperatureUnit" name="temperatureUnit" defaultValue={defaults.temperatureUnit}>
							<option value="C">Celsius</option>
							<option value="F">Fahrenheit</option>
						</Select>
					</div>
					<div>
						<Label htmlFor="grindSize">{locale === "id" ? "Ukuran Giling" : "Grind Size"}</Label>
						<Input id="grindSize" name="grindSize" defaultValue={defaults.grindSize} required />
					</div>
					<div>
						<Label htmlFor="grindClicks">{locale === "id" ? "Klik Grinder (Opsional)" : "Grind Clicks (Optional)"}</Label>
						<Input id="grindClicks" name="grindClicks" type="number" defaultValue={defaults.grindClicks || ""} />
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="brewTimeSeconds">{locale === "id" ? "Waktu Seduh (Detik)" : "Brew Time (Seconds)"}</Label>
						<Input
							id="brewTimeSeconds"
							name="brewTimeSeconds"
							type="number"
							defaultValue={defaults.brewTimeSeconds}
							required
						/>
					</div>
					<div>
						<Label htmlFor="status">Status</Label>
						<Select id="status" name="status" defaultValue={defaults.status}>
							<option value="draft">{locale === "id" ? "Draft" : "Draft"}</option>
							<option value="published">{locale === "id" ? "Publik" : "Published"}</option>
							<option value="hidden">{locale === "id" ? "Disembunyikan" : "Hidden"}</option>
						</Select>
					</div>
				</div>

				<section className="space-y-3 rounded-2xl border bg-(--surface) p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h3 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Gambar Brew" : "Brew Image"}</h3>
							<p className="text-xs text-(--muted)">
								{locale === "id"
									? "Pilih tepat satu sumber: unggah gambar atau masukkan URL (contoh: Unsplash)."
									: "Choose exactly one source: upload an image or use an external URL (for example, Unsplash)."}
							</p>
						</div>
						<div className="inline-flex rounded-lg border bg-(--surface-elevated) p-1">
							<button
								type="button"
								onClick={() => setImageMode("upload")}
								className={cn(
									"rounded-md px-3 py-1.5 text-sm font-semibold",
									imageMode === "upload" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)",
								)}
							>
								{locale === "id" ? "Upload" : "Upload"}
							</button>
							<button
								type="button"
								onClick={() => setImageMode("url")}
								className={cn(
									"rounded-md px-3 py-1.5 text-sm font-semibold",
									imageMode === "url" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)",
								)}
							>
								URL
							</button>
						</div>
					</div>

					{imageMode === "upload" ? (
						<div className="space-y-2">
							<label className="inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/15">
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp"
									onChange={onUploadImage}
									disabled={isUploadingImage || isSubmitting || isDeleting}
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
							<Label htmlFor="imageUrl">{locale === "id" ? "URL Gambar (Unsplash)" : "Image URL (Unsplash)"}</Label>
							<Input
								id="imageUrl"
								value={imageUrlInput}
								onChange={(event) => setImageUrlInput(event.currentTarget.value)}
								placeholder={DEFAULT_BREW_IMAGE_URL}
							/>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="imageAlt">{locale === "id" ? "Alt Gambar (Opsional)" : "Image Alt (Optional)"}</Label>
						<Input
							id="imageAlt"
							value={imageAlt}
							onChange={(event) => setImageAlt(event.currentTarget.value)}
							disabled={!hasCustomImage}
							placeholder={locale === "id" ? "Contoh: V60 di meja kayu." : "Example: V60 setup on a wooden table."}
						/>
					</div>

					<div className="space-y-2">
						<div className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-(--surface-elevated)">
							<Image
								src={imagePreviewUrl}
								alt={imageAlt || defaults.name || "Brew image"}
								fill
								sizes="(max-width: 768px) 100vw, 800px"
								className="object-cover"
							/>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-xs text-(--muted)">
								{hasCustomImage
									? locale === "id"
										? "Pratinjau gambar brew."
										: "Brew image preview."
									: locale === "id"
										? "Belum ada gambar khusus, memakai fallback Unsplash."
										: "No custom image yet, using Unsplash fallback."}
							</p>
							{hasCustomImage ? (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => (imageMode === "upload" ? setUploadedImageUrl("") : setImageUrlInput(""))}
								>
									{locale === "id" ? "Hapus Gambar" : "Clear Image"}
								</Button>
							) : null}
						</div>
					</div>

					{imageError ? <p className="text-sm text-(--danger)">{imageError}</p> : null}
				</section>

				<section className="space-y-3 rounded-2xl border bg-(--surface) p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h3 className="font-heading text-xl text-(--espresso)">
								{locale === "id" ? "Referensi Ukuran Giling" : "Grind Reference"}
							</h3>
							<p className="text-xs text-(--muted)">
								{locale === "id"
									? "Foto referensi ukuran giling ideal untuk mencapai profil rasa terbaik."
									: "Macro-photo reference of ideal grind size for best flavor profile."}
							</p>
						</div>
						<div className="inline-flex rounded-lg border bg-(--surface-elevated) p-1">
							<button
								type="button"
								onClick={() => setGrindReferenceImageMode("upload")}
								className={cn(
									"rounded-md px-3 py-1.5 text-sm font-semibold",
									grindReferenceImageMode === "upload" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)",
								)}
							>
								{locale === "id" ? "Upload" : "Upload"}
							</button>
							<button
								type="button"
								onClick={() => setGrindReferenceImageMode("url")}
								className={cn(
									"rounded-md px-3 py-1.5 text-sm font-semibold",
									grindReferenceImageMode === "url" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)",
								)}
							>
								URL
							</button>
						</div>
					</div>

					{grindReferenceImageMode === "upload" ? (
						<div className="space-y-2">
							<label className="inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/15">
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp"
									onChange={onUploadGrindReferenceImage}
									disabled={isUploadingGrindReferenceImage || isSubmitting || isDeleting}
									className="hidden"
								/>
								{isUploadingGrindReferenceImage
									? locale === "id"
										? "Mengunggah..."
										: "Uploading..."
									: locale === "id"
										? "Unggah Referensi Giling"
										: "Upload Grind Reference"}
							</label>
							<p className="text-xs text-(--muted)">
								{locale === "id" ? "Format JPG/PNG/WEBP, maks 5MB." : "JPG/PNG/WEBP up to 5MB."}
							</p>
						</div>
					) : (
						<div className="space-y-2">
							<Label htmlFor="grindReferenceImageUrl">
								{locale === "id" ? "URL Referensi Giling" : "Grind Reference URL"}
							</Label>
							<Input
								id="grindReferenceImageUrl"
								value={grindReferenceImageUrlInput}
								onChange={(event) => setGrindReferenceImageUrlInput(event.currentTarget.value)}
								placeholder={DEFAULT_BREW_IMAGE_URL}
							/>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="grindReferenceImageAlt">
							{locale === "id" ? "Alt Referensi Giling (Opsional)" : "Grind Reference Alt (Optional)"}
						</Label>
						<Input
							id="grindReferenceImageAlt"
							value={grindReferenceImageAlt}
							onChange={(event) => setGrindReferenceImageAlt(event.currentTarget.value)}
							disabled={!hasCustomGrindReferenceImage}
							placeholder={locale === "id" ? "Contoh: ukuran medium-fine untuk V60." : "Example: medium-fine target for V60."}
						/>
					</div>

					<div className="space-y-2">
						<div className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-(--surface-elevated)">
							<Image
								src={grindReferenceImagePreviewUrl}
								alt={grindReferenceImageAlt || defaults.name || "Grind reference image"}
								fill
								sizes="(max-width: 768px) 100vw, 800px"
								className="object-cover"
							/>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-xs text-(--muted)">
								{hasCustomGrindReferenceImage
									? locale === "id"
										? "Pratinjau gambar referensi giling."
										: "Grind reference preview."
									: locale === "id"
										? "Belum ada referensi khusus, memakai fallback Unsplash."
										: "No custom grind reference yet, using Unsplash fallback."}
							</p>
							{hasCustomGrindReferenceImage ? (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() =>
										grindReferenceImageMode === "upload"
											? setUploadedGrindReferenceImageUrl("")
											: setGrindReferenceImageUrlInput("")
									}
								>
									{locale === "id" ? "Hapus Referensi" : "Clear Reference"}
								</Button>
							) : null}
						</div>
					</div>

					{grindReferenceImageError ? <p className="text-sm text-(--danger)">{grindReferenceImageError}</p> : null}
				</section>

				<div className="grid gap-2">
					<Label htmlFor="tags">{locale === "id" ? "Tag (pisahkan dengan koma)" : "Tags (comma-separated)"}</Label>
					<Input
						id="tags"
						name="tags"
						value={tagsInput}
						onChange={(event) => setTagsInput(event.currentTarget.value)}
						placeholder={locale === "id" ? "v60, fruity, light-roast" : "v60, fruity, light-roast"}
						maxLength={320}
					/>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="notes">{locale === "id" ? "Catatan" : "Notes"}</Label>
					<RichTextEditor id="notes" name="notes" value={notes} onChange={setNotes} maxPlainTextLength={5000} />
				</div>

				{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						{mode === "edit" ? (
							<Button
								type="button"
								variant="destructive"
								onClick={() => setDeleteOpen(true)}
								disabled={isSubmitting || isDeleting}
							>
								{locale === "id" ? "Hapus Racikan" : "Delete Brew"}
							</Button>
						) : null}
					</div>
					<div className="flex items-center gap-3">
						<Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting || isDeleting}>
							{locale === "id" ? "Batal" : "Cancel"}
						</Button>
						<Button disabled={isSubmitting || isUploadingImage || isDeleting} type="submit">
							{isSubmitting
								? locale === "id"
									? "Menyimpan..."
									: "Saving..."
								: mode === "create"
									? locale === "id"
										? "Buat Racikan"
										: "Create Brew"
									: locale === "id"
										? "Perbarui Racikan"
										: "Update Brew"}
						</Button>
					</div>
				</div>
			</form>

			<DeleteModal
				open={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				onConfirm={onDeleteBrew}
				isSubmitting={isDeleting}
				title={locale === "id" ? "Hapus Racikan" : "Delete Brew"}
				description={
					locale === "id"
						? "Racikan ini akan dihapus permanen beserta data turunannya."
						: "This brew will be permanently deleted along with related review data."
				}
				confirmLabel={locale === "id" ? "Hapus" : "Delete"}
			/>
		</>
	);
}
