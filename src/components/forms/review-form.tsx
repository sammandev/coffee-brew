"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const scoreOptions = [1, 2, 3, 4, 5];

export function ReviewForm({ brewId }: { brewId: string }) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
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
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Unable to submit review");
			return;
		}

		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-5">
			<h3 className="font-heading text-xl text-(--espresso)">
				{locale === "id" ? "Nilai Racikan Ini" : "Rate This Brew"}
			</h3>

			<div className="grid gap-4 md:grid-cols-5">
				{[
					["acidity", "Acidity", "Keasaman"],
					["sweetness", "Sweetness", "Kemanisan"],
					["body", "Body", "Body"],
					["aroma", "Aroma", "Aroma"],
					["balance", "Balance", "Keseimbangan"],
				].map(([field, labelEn, labelId]) => (
					<div key={field}>
						<Label htmlFor={field}>{locale === "id" ? labelId : labelEn}</Label>
						<Select name={field} id={field} defaultValue="4">
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
				<Textarea
					id="notes"
					name="notes"
					placeholder={
						locale === "id"
							? "Catatan rasa, aftertaste, dan penyesuaian seduh..."
							: "Flavor notes, aftertaste, brewing tweaks..."
					}
				/>
			</div>

			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<div className="flex justify-end">
				<Button type="submit">{locale === "id" ? "Kirim Review" : "Submit Review"}</Button>
			</div>
		</form>
	);
}
