"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentComposer({ threadId }: { threadId: string }) {
	const { t, locale } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const formData = new FormData(event.currentTarget);
		const payload = {
			content: String(formData.get("content") ?? ""),
		};

		const response = await fetch(`/api/forum/threads/${threadId}/comments`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Could not post comment");
			return;
		}

		event.currentTarget.reset();
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
			<Textarea
				name="content"
				placeholder={locale === "id" ? "Bagikan pandanganmu tentang seduhan ini..." : "Share your brew thoughts..."}
				required
			/>
			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<div className="flex justify-end">
				<Button type="submit" size="sm">
					{t("common.reply")}
				</Button>
			</div>
		</form>
	);
}
