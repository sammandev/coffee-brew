"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface CommentComposerProps {
	authorName?: string;
	currentUserId?: string;
	threadId: string;
	parentCommentId?: string | null;
	placeholder?: string;
	submitLabel?: string;
}

export function CommentComposer({
	authorName,
	currentUserId,
	threadId,
	parentCommentId = null,
	placeholder,
	submitLabel,
}: CommentComposerProps) {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [draftId, setDraftId] = useState<string | null>(null);
	const [draftLoaded, setDraftLoaded] = useState(false);
	const [typingChannelReady, setTypingChannelReady] = useState(false);
	const typingChannelRef = useRef<RealtimeChannel | null>(null);
	const lastTypingAtRef = useRef<number>(0);

	useEffect(() => {
		let active = true;
		void (async () => {
			const response = await fetch(`/api/forum/drafts?type=comment&threadId=${encodeURIComponent(threadId)}`, {
				method: "GET",
			}).catch(() => null);
			if (!active) return;
			if (!response?.ok) {
				setDraftLoaded(true);
				return;
			}
			const body = (await response.json().catch(() => ({}))) as {
				draft?: { id?: string; payload?: { content?: string; parentCommentId?: string | null } };
			};
			const draft = body.draft;
			if (draft?.id) {
				setDraftId(draft.id);
			}
			if (
				draft?.payload &&
				typeof draft.payload.content === "string" &&
				(draft.payload.parentCommentId ?? null) === parentCommentId
			) {
				setContent(draft.payload.content);
			}
			setDraftLoaded(true);
		})();

		return () => {
			active = false;
		};
	}, [threadId, parentCommentId]);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase.channel(`thread-typing-${threadId}`);
		typingChannelRef.current = channel;
		setTypingChannelReady(false);
		channel.subscribe((status) => {
			if (status === "SUBSCRIBED") {
				setTypingChannelReady(true);
			}
		});
		return () => {
			typingChannelRef.current = null;
			setTypingChannelReady(false);
			void supabase.removeChannel(channel);
		};
	}, [threadId]);

	useEffect(() => {
		if (!draftLoaded) return;
		if (content.trim().length === 0) return;
		const timeout = setTimeout(() => {
			void (async () => {
				const response = await fetch("/api/forum/drafts", {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						draftType: "comment",
						threadId,
						payload: {
							content,
							parentCommentId,
						},
					}),
				}).catch(() => null);
				if (!response?.ok) return;
				const body = (await response.json().catch(() => ({}))) as { draft?: { id?: string } };
				if (body.draft?.id) {
					setDraftId(body.draft.id);
				}
			})();
		}, 1200);
		return () => clearTimeout(timeout);
	}, [content, threadId, parentCommentId, draftLoaded]);

	function broadcastTyping(nextContent: string) {
		if (!typingChannelRef.current || !currentUserId) return;
		if (!typingChannelReady) return;
		if (nextContent.trim().length === 0) return;
		const now = Date.now();
		if (now - lastTypingAtRef.current < 1200) return;
		lastTypingAtRef.current = now;
		void typingChannelRef.current.send({
			type: "broadcast",
			event: "typing",
			payload: {
				threadId,
				userId: currentUserId,
				name: authorName ?? "User",
			},
		});
	}

	async function clearDraft() {
		if (!draftId) return;
		await fetch(`/api/forum/drafts/${draftId}`, { method: "DELETE" }).catch(() => null);
		setDraftId(null);
	}

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
		void clearDraft();
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
			<RichTextEditor
				name="content"
				value={content}
				onChange={(value) => {
					setContent(value);
					broadcastTyping(value);
				}}
				minPlainTextLength={1}
				maxPlainTextLength={3000}
				enableImageUpload
				enableMentions
				imageUploadEndpoint="/api/forum/media"
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
