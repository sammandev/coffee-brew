"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface ThreadComposerProps {
	hideTitle?: boolean;
	onSubmitted?: () => void;
}

export function ThreadComposer({ hideTitle = false, onSubmitted }: ThreadComposerProps) {
	const { t, locale } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [tagsInput, setTagsInput] = useState("");

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		const tags = tagsInput
			.split(",")
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index);

		const payload = {
			title,
			content,
			tags,
		};

		const response = await fetch("/api/forum/threads", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not create thread");
			setIsSubmitting(false);
			return;
		}

		setTitle("");
		setContent("");
		setTagsInput("");
		setIsSubmitting(false);
		onSubmitted?.();
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
			{hideTitle ? null : <h2 className="font-heading text-xl text-(--espresso)">{t("forum.startDiscussion")}</h2>}
			<div>
				<Label htmlFor="thread-title">{locale === "id" ? "Judul" : "Title"}</Label>
				<Input
					id="thread-title"
					name="title"
					required
					maxLength={180}
					value={title}
					onChange={(event) => setTitle(event.currentTarget.value)}
				/>
			</div>
			<div>
				<Label htmlFor="thread-content">{locale === "id" ? "Konten" : "Content"}</Label>
				<RichTextEditor
					id="thread-content"
					name="content"
					value={content}
					onChange={setContent}
					minPlainTextLength={4}
					maxPlainTextLength={6000}
				/>
			</div>
			<div>
				<Label htmlFor="thread-tags">{locale === "id" ? "Tag (pisahkan dengan koma)" : "Tags (comma-separated)"}</Label>
				<Input
					id="thread-tags"
					name="tags"
					maxLength={200}
					placeholder="espresso, v60, roast-level"
					value={tagsInput}
					onChange={(event) => setTagsInput(event.currentTarget.value)}
				/>
			</div>
			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? t("forum.posting") : t("forum.postThread")}
			</Button>
		</form>
	);
}
