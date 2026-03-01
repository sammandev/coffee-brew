"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ForumSubforumOption {
	id: string;
	name_en: string;
	name_id: string;
	slug: string;
}

interface ThreadComposerProps {
	hideTitle?: boolean;
	initialContent?: string;
	initialTags?: string[];
	initialTitle?: string;
	initialSubforumId?: string;
	onSubmitted?: () => void;
	subforums?: ForumSubforumOption[];
	variant?: "embedded" | "standalone";
}

export function ThreadComposer({
	hideTitle = false,
	initialContent = "",
	initialTags = [],
	initialTitle = "",
	initialSubforumId,
	onSubmitted,
	subforums = [],
	variant = "standalone",
}: ThreadComposerProps) {
	const { t, locale } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [subforumId, setSubforumId] = useState(initialSubforumId ?? subforums[0]?.id ?? "");
	const [title, setTitle] = useState(initialTitle);
	const [content, setContent] = useState(initialContent);
	const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
	const [draftId, setDraftId] = useState<string | null>(null);
	const [draftLoaded, setDraftLoaded] = useState(false);
	const [enablePoll, setEnablePoll] = useState(false);
	const [pollQuestion, setPollQuestion] = useState("");
	const [pollOptionsInput, setPollOptionsInput] = useState("");
	const [pollClosesAt, setPollClosesAt] = useState("");
	const hasPrefill = useMemo(
		() => initialTitle.trim().length > 0 || initialContent.trim().length > 0 || initialTags.length > 0,
		[initialContent, initialTags, initialTitle],
	);

	useEffect(() => {
		setSubforumId(initialSubforumId ?? subforums[0]?.id ?? "");
	}, [initialSubforumId, subforums]);

	useEffect(() => {
		if (!hasPrefill) return;
		setTitle(initialTitle);
		setContent(initialContent);
		setTagsInput(initialTags.join(", "));
	}, [hasPrefill, initialContent, initialTags, initialTitle]);

	useEffect(() => {
		if (!subforumId) return;
		if (hasPrefill) {
			setDraftLoaded(true);
			return;
		}
		let active = true;
		void (async () => {
			const response = await fetch(`/api/forum/drafts?type=thread&subforumId=${encodeURIComponent(subforumId)}`, {
				method: "GET",
			}).catch(() => null);
			if (!active) return;
			if (!response?.ok) {
				setDraftLoaded(true);
				return;
			}
			const body = (await response.json().catch(() => ({}))) as {
				draft?: {
					id?: string;
					payload?: {
						title?: string;
						content?: string;
						tagsInput?: string;
						pollQuestion?: string;
						pollOptionsInput?: string;
						pollClosesAt?: string;
						enablePoll?: boolean;
					};
				};
			};
			const draft = body.draft;
			if (draft?.id) setDraftId(draft.id);
			if (draft?.payload) {
				if (typeof draft.payload.title === "string") setTitle(draft.payload.title);
				if (typeof draft.payload.content === "string") setContent(draft.payload.content);
				if (typeof draft.payload.tagsInput === "string") setTagsInput(draft.payload.tagsInput);
				if (typeof draft.payload.enablePoll === "boolean") setEnablePoll(draft.payload.enablePoll);
				if (typeof draft.payload.pollQuestion === "string") setPollQuestion(draft.payload.pollQuestion);
				if (typeof draft.payload.pollOptionsInput === "string") setPollOptionsInput(draft.payload.pollOptionsInput);
				if (typeof draft.payload.pollClosesAt === "string") setPollClosesAt(draft.payload.pollClosesAt);
			}
			setDraftLoaded(true);
		})();

		return () => {
			active = false;
		};
	}, [hasPrefill, subforumId]);

	useEffect(() => {
		if (!draftLoaded) return;
		if (!subforumId) return;
		const timeout = setTimeout(() => {
			void fetch("/api/forum/drafts", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					draftType: "thread",
					subforumId,
					payload: {
						title,
						content,
						tagsInput,
						enablePoll,
						pollQuestion,
						pollOptionsInput,
						pollClosesAt,
					},
				}),
			})
				.then(async (response) => {
					if (!response.ok) return null;
					return (await response.json().catch(() => ({}))) as { draft?: { id?: string } };
				})
				.then((body) => {
					if (body?.draft?.id) {
						setDraftId(body.draft.id);
					}
				})
				.catch(() => null);
		}, 1200);

		return () => clearTimeout(timeout);
	}, [title, content, tagsInput, enablePoll, pollQuestion, pollOptionsInput, pollClosesAt, subforumId, draftLoaded]);

	async function clearDraft() {
		if (!draftId) return;
		await fetch(`/api/forum/drafts/${draftId}`, { method: "DELETE" }).catch(() => null);
		setDraftId(null);
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		const tags = tagsInput
			.split(",")
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag, index, arr) => tag.length > 0 && arr.indexOf(tag) === index);

		const payload = {
			subforumId,
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

		const body = (await response.json().catch(() => ({}))) as { thread?: { id?: string } };
		const threadId = body.thread?.id;
		if (threadId && enablePoll) {
			const pollOptions = Array.from(
				new Set(
					pollOptionsInput
						.split(",")
						.map((option) => option.trim())
						.filter((option) => option.length > 0),
				),
			);
			if (pollQuestion.trim().length > 0 && pollOptions.length >= 2) {
				await fetch(`/api/forum/threads/${threadId}/poll`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						question: pollQuestion,
						options: pollOptions,
						closesAt: pollClosesAt.trim().length > 0 ? new Date(pollClosesAt).toISOString() : null,
					}),
				}).catch(() => null);
			}
		}

		setSubforumId(initialSubforumId ?? subforums[0]?.id ?? "");
		setTitle("");
		setContent("");
		setTagsInput("");
		setEnablePoll(false);
		setPollQuestion("");
		setPollOptionsInput("");
		setPollClosesAt("");
		setIsSubmitting(false);
		void clearDraft();
		onSubmitted?.();
		router.refresh();
	}

	return (
		<form
			onSubmit={onSubmit}
			className={cn(
				"grid gap-3",
				variant === "standalone"
					? "rounded-3xl border bg-(--surface-elevated) p-5"
					: "rounded-none border-0 bg-transparent p-0",
			)}
		>
			{hideTitle ? null : <h2 className="font-heading text-xl text-(--espresso)">{t("forum.startDiscussion")}</h2>}
			<div>
				<Label htmlFor="thread-subforum">{locale === "id" ? "Sub-Forum" : "Sub-forum"}</Label>
				<Select
					id="thread-subforum"
					name="subforumId"
					required
					value={subforumId}
					onChange={(event) => setSubforumId(event.currentTarget.value)}
				>
					{subforums.map((subforum) => (
						<option key={subforum.id} value={subforum.id}>
							{locale === "id" ? subforum.name_id : subforum.name_en}
						</option>
					))}
				</Select>
			</div>
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
					enableImageUpload
					enableMentions
					imageUploadEndpoint="/api/forum/media"
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
			<div className="space-y-3 rounded-2xl border bg-(--surface) p-3">
				<Label htmlFor="thread-enable-poll" className="inline-flex items-center gap-2 text-sm">
					<Checkbox
						id="thread-enable-poll"
						checked={enablePoll}
						onChange={(event) => setEnablePoll(event.currentTarget.checked)}
					/>
					<span>{locale === "id" ? "Tambahkan polling" : "Add a poll"}</span>
				</Label>
				{enablePoll ? (
					<div className="grid gap-3">
						<div>
							<Label htmlFor="thread-poll-question">{locale === "id" ? "Pertanyaan Polling" : "Poll Question"}</Label>
							<Input
								id="thread-poll-question"
								value={pollQuestion}
								onChange={(event) => setPollQuestion(event.currentTarget.value)}
								maxLength={240}
							/>
						</div>
						<div>
							<Label htmlFor="thread-poll-options">
								{locale === "id" ? "Opsi (pisahkan koma)" : "Options (comma separated)"}
							</Label>
							<Input
								id="thread-poll-options"
								value={pollOptionsInput}
								onChange={(event) => setPollOptionsInput(event.currentTarget.value)}
							/>
						</div>
						<div>
							<Label htmlFor="thread-poll-closes">{locale === "id" ? "Tutup pada (opsional)" : "Close at (optional)"}</Label>
							<Input
								id="thread-poll-closes"
								type="datetime-local"
								value={pollClosesAt}
								onChange={(event) => setPollClosesAt(event.currentTarget.value)}
							/>
						</div>
					</div>
				) : null}
			</div>
			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<Button type="submit" disabled={isSubmitting || !subforumId}>
				{isSubmitting ? t("forum.posting") : t("forum.postThread")}
			</Button>
		</form>
	);
}
