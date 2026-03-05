"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { getDimensionLabels } from "@/lib/i18n/messages";

const scoreOptions = [1, 2, 3, 4, 5];

interface InitialReview {
	acidity: number;
	aroma: number;
	balance: number;
	body: number;
	notes?: string | null;
	star_rating?: number | null;
	sweetness: number;
}

export function ReviewForm({ brewId, initialReview }: { brewId: string; initialReview?: InitialReview | null }) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [notes, setNotes] = useState(initialReview?.notes ?? "");
	const [starRating, setStarRating] = useState<number | null>(initialReview?.star_rating ?? null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditMode = Boolean(initialReview);
	const [isExpanded, setIsExpanded] = useState(!isEditMode);

	useEffect(() => {
		setNotes(initialReview?.notes ?? "");
	}, [initialReview?.notes]);

	useEffect(() => {
		setStarRating(initialReview?.star_rating ?? null);
	}, [initialReview?.star_rating]);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (starRating === null) return;
		setError(null);
		setIsSubmitting(true);
		const formData = new FormData(event.currentTarget);

		const payload = {
			acidity: Number(formData.get("acidity")),
			sweetness: Number(formData.get("sweetness")),
			body: Number(formData.get("body")),
			aroma: Number(formData.get("aroma")),
			balance: Number(formData.get("balance")),
			star_rating: starRating,
			notes: String(formData.get("notes") ?? ""),
		};

		const response = await fetch(`/api/reviews/${brewId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Unable to submit review");
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		if (isEditMode) setIsExpanded(false);
		router.refresh();
	}

	// Collapsed summary card shown when user already has a review and hasn't clicked Edit
	if (isEditMode && !isExpanded) {
		const stars = initialReview?.star_rating ?? null;
		return (
			<div className="flex items-center justify-between rounded-3xl border bg-(--surface-elevated) px-5 py-4">
				<div className="flex items-center gap-3">
					<span className="font-heading text-base text-(--espresso)">{locale === "id" ? "Review Anda" : "Your Review"}</span>
					{stars !== null ? (
						<span className="flex items-center gap-1 rounded-full bg-(--crema) px-2 py-0.5 text-sm font-semibold text-(--espresso)">
							{"★".repeat(stars)}
							{"☆".repeat(5 - stars)}
							<span className="ml-1">{stars}/5</span>
						</span>
					) : (
						<span className="text-sm text-(--muted)">{locale === "id" ? "Belum dinilai" : "Not rated"}</span>
					)}
				</div>
				<Button type="button" variant="outline" onClick={() => setIsExpanded(true)}>
					{locale === "id" ? "Edit" : "Edit"}
				</Button>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-5">
			<div className="flex items-center justify-between">
				<h3 className="font-heading text-xl text-(--espresso)">
					{isEditMode
						? locale === "id"
							? "Perbarui Review Anda"
							: "Update Your Review"
						: locale === "id"
							? "Nilai Racikan Ini"
							: "Rate This Brew"}
				</h3>
				{isEditMode && (
					<button
						type="button"
						onClick={() => setIsExpanded(false)}
						className="text-sm text-(--muted) hover:text-(--espresso) transition-colors"
						aria-label={locale === "id" ? "Tutup form" : "Collapse form"}
					>
						{locale === "id" ? "Tutup" : "Collapse"}
					</button>
				)}
			</div>

			{/* Star rating widget */}
			<div>
				<Label>{locale === "id" ? "Penilaian Anda" : "Your Rating"}</Label>
				<div className="mt-2 flex items-center gap-1">
					{[1, 2, 3, 4, 5].map((star) => (
						<button
							key={star}
							type="button"
							onClick={() => setStarRating(star)}
							className="transition-transform hover:scale-110 focus:outline-none"
							aria-label={`${star} ${star === 1 ? (locale === "id" ? "bintang" : "star") : locale === "id" ? "bintang" : "stars"}`}
						>
							<svg
								width="32"
								height="32"
								viewBox="0 0 24 24"
								fill={starRating !== null && star <= starRating ? "var(--crema)" : "none"}
								stroke={starRating !== null && star <= starRating ? "var(--crema)" : "var(--sand)"}
								strokeWidth="2"
								aria-hidden="true"
								focusable="false"
							>
								<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
							</svg>
						</button>
					))}
					{starRating !== null ? (
						<span className="ml-2 text-sm font-semibold text-(--espresso)">{starRating}/5</span>
					) : (
						<span className="ml-2 text-sm text-(--muted)">{locale === "id" ? "Pilih bintang" : "Select a rating"}</span>
					)}
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-5">
				{getDimensionLabels(locale).map((field) => (
					<div key={field.key}>
						<Label htmlFor={field.key}>{field.label}</Label>
						<Select name={field.key} id={field.key} defaultValue={String(initialReview?.[field.key] ?? 4)}>
							{scoreOptions.map((score) => (
								<option value={score} key={score}>
									{score}
								</option>
							))}
						</Select>
					</div>
				))}
			</div>

			<div>
				<Label htmlFor="notes">{locale === "id" ? "Catatan" : "Notes"}</Label>
				<RichTextEditor id="notes" name="notes" value={notes} onChange={setNotes} maxPlainTextLength={2000} />
				<p className="mt-2 text-xs text-(--muted)">
					{locale === "id"
						? "Catatan rasa, aftertaste, dan penyesuaian seduh..."
						: "Flavor notes, aftertaste, brewing tweaks..."}
				</p>
			</div>

			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<div className="flex justify-end">
				<Button type="submit" disabled={isSubmitting || starRating === null}>
					{isSubmitting
						? locale === "id"
							? "Mengirim..."
							: "Submitting..."
						: isEditMode
							? locale === "id"
								? "Perbarui Review"
								: "Update Review"
							: locale === "id"
								? "Kirim Review"
								: "Submit Review"}
				</Button>
			</div>
		</form>
	);
}
