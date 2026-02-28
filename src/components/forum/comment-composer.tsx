"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface CommentComposerProps {
	threadId: string;
	parentCommentId?: string | null;
	placeholder?: string;
	submitLabel?: string;
}

export function CommentComposer({ threadId, parentCommentId = null, placeholder, submitLabel }: CommentComposerProps) {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		const payload = {
			content,
			parentCommentId,
		};

		const response = await fetch(`/api/forum/threads/${threadId}/comments`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not post comment");
			setIsSubmitting(false);
			return;
		}

		setContent("");
		setIsSubmitting(false);
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
			<RichTextEditor
				name="content"
				value={content}
				onChange={setContent}
				minPlainTextLength={1}
				maxPlainTextLength={3000}
			/>
			<p className="text-xs text-(--muted)">
				{placeholder ?? (locale === "id" ? "Bagikan pandanganmu tentang seduhan ini..." : "Share your brew thoughts...")}
			</p>
			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<div className="flex justify-end">
				<Button type="submit" size="sm" disabled={isSubmitting}>
					{isSubmitting ? (locale === "id" ? "Mengirim..." : "Sending...") : (submitLabel ?? t("common.reply"))}
				</Button>
			</div>
		</form>
	);
}
