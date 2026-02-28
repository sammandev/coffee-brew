"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ThreadComposer() {
	const { t, locale } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const formData = new FormData(event.currentTarget);
		const payload = {
			title: String(formData.get("title") ?? ""),
			content: String(formData.get("content") ?? ""),
		};

		const response = await fetch("/api/forum/threads", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Could not create thread");
			setIsSubmitting(false);
			return;
		}

		event.currentTarget.reset();
		setIsSubmitting(false);
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border bg-[var(--surface-elevated)] p-5">
			<h2 className="font-heading text-xl text-[var(--espresso)]">{t("forum.startDiscussion")}</h2>
			<div>
				<Label htmlFor="thread-title">{locale === "id" ? "Judul" : "Title"}</Label>
				<Input id="thread-title" name="title" required maxLength={180} />
			</div>
			<div>
				<Label htmlFor="thread-content">{locale === "id" ? "Konten" : "Content"}</Label>
				<Textarea id="thread-content" name="content" required maxLength={6000} />
			</div>
			{error && <p className="text-sm text-[var(--danger)]">{error}</p>}
			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? t("forum.posting") : t("forum.postThread")}
			</Button>
		</form>
	);
}
