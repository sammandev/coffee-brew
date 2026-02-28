"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FaqForm() {
	const { t } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const formData = new FormData(event.currentTarget);

		const payload = {
			question_en: String(formData.get("question_en") ?? ""),
			answer_en: String(formData.get("answer_en") ?? ""),
			question_id: String(formData.get("question_id") ?? ""),
			answer_id: String(formData.get("answer_id") ?? ""),
			order_index: Number(formData.get("order_index") ?? 0),
			is_visible: formData.get("is_visible") === "on",
		};

		const response = await fetch("/api/admin/faq", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Could not create FAQ item");
			return;
		}

		event.currentTarget.reset();
		router.refresh();
	}

	return (
		<form className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5" onSubmit={onSubmit}>
			<h3 className="font-heading text-xl text-(--espresso)">{t("admin.faq")}</h3>

			<div>
				<Label htmlFor="question_en">Question (English)</Label>
				<Input id="question_en" name="question_en" required />
			</div>
			<div>
				<Label htmlFor="answer_en">Answer (English)</Label>
				<Textarea id="answer_en" name="answer_en" required />
			</div>
			<div>
				<Label htmlFor="question_id">Question (Bahasa)</Label>
				<Input id="question_id" name="question_id" required />
			</div>
			<div>
				<Label htmlFor="answer_id">Answer (Bahasa)</Label>
				<Textarea id="answer_id" name="answer_id" required />
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="order_index">Order</Label>
					<Input id="order_index" name="order_index" type="number" defaultValue={0} />
				</div>
				<label className="flex items-center gap-2 self-end text-sm text-(--muted)">
					<input type="checkbox" name="is_visible" defaultChecked className="size-4 rounded border" />
					Visible
				</label>
			</div>

			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<Button type="submit">{t("common.save")}</Button>
		</form>
	);
}
