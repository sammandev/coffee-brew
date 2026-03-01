"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";

const scoreOptions = [1, 2, 3, 4, 5];
const REVIEW_FIELDS = [
	{ key: "acidity", labelEn: "Acidity", labelId: "Keasaman" },
	{ key: "sweetness", labelEn: "Sweetness", labelId: "Kemanisan" },
	{ key: "body", labelEn: "Body", labelId: "Body" },
	{ key: "aroma", labelEn: "Aroma", labelId: "Aroma" },
	{ key: "balance", labelEn: "Balance", labelId: "Keseimbangan" },
] as const;

interface InitialReview {
	acidity: number;
	aroma: number;
	balance: number;
	body: number;
	notes?: string | null;
	sweetness: number;
}

export function ReviewForm({ brewId, initialReview }: { brewId: string; initialReview?: InitialReview | null }) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [notes, setNotes] = useState(initialReview?.notes ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditMode = Boolean(initialReview);

	useEffect(() => {
		setNotes(initialReview?.notes ?? "");
	}, [initialReview?.notes]);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		const formData = new FormData(event.currentTarget);

		const payload = {
			acidity: Number(formData.get("acidity")),
			sweetness: Number(formData.get("sweetness")),
			body: Number(formData.get("body")),
			aroma: Number(formData.get("aroma")),
			balance: Number(formData.get("balance")),
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
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-5">
			<h3 className="font-heading text-xl text-(--espresso)">
				{isEditMode
					? locale === "id"
						? "Perbarui Review Anda"
						: "Update Your Review"
					: locale === "id"
						? "Nilai Racikan Ini"
						: "Rate This Brew"}
			</h3>

			<div className="grid gap-4 md:grid-cols-5">
				{REVIEW_FIELDS.map((field) => (
					<div key={field.key}>
						<Label htmlFor={field.key}>{locale === "id" ? field.labelId : field.labelEn}</Label>
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
				<Button type="submit" disabled={isSubmitting}>
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
