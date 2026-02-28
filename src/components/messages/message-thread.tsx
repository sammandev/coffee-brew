"use client";

import { Flag, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn, formatDate } from "@/lib/utils";

interface ThreadParticipant {
	user_id: string;
	last_read_at: string | null;
	last_seen_at: string | null;
	profile: {
		id: string;
		display_name: string;
		email: string | null;
		avatar_url: string | null;
		is_verified: boolean;
	} | null;
}

interface ThreadMessage {
	id: string;
	conversation_id: string;
	sender_id: string;
	body_html: string;
	body_text: string;
	edited_at: string | null;
	created_at: string;
	sender: {
		id: string;
		display_name: string;
		email: string | null;
		avatar_url: string | null;
		is_verified: boolean;
	} | null;
	attachments: Array<{
		id: string;
		public_url: string;
		mime_type: string;
		size_bytes: number;
		metadata: Record<string, unknown>;
		created_at: string;
	}>;
}

interface ThreadResponse {
	messages?: ThreadMessage[];
	participants?: ThreadParticipant[];
}

interface MessageThreadProps {
	conversationId: string;
	currentUserId: string;
	initialCounterpartName: string;
}

export function MessageThread({ conversationId, currentUserId, initialCounterpartName }: MessageThreadProps) {
	const { locale } = useAppPreferences();
	const [messages, setMessages] = useState<ThreadMessage[]>([]);
	const [participants, setParticipants] = useState<ThreadParticipant[]>([]);
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const [composerHtml, setComposerHtml] = useState("<p></p>");
	const [error, setError] = useState<string | null>(null);
	const [typingCount, setTypingCount] = useState(0);
	const typingSentAtRef = useRef(0);
	const typingStatesRef = useRef<Record<string, number>>({});
	const [reportOpen, setReportOpen] = useState(false);
	const [reportMessageId, setReportMessageId] = useState<string | null>(null);
	const [reportReason, setReportReason] = useState("");
	const [reportDetail, setReportDetail] = useState("");
	const [reporting, setReporting] = useState(false);

	const counterpart = useMemo(
		() => participants.find((participant) => participant.user_id !== currentUserId) ?? null,
		[participants, currentUserId],
	);

	const counterpartName =
		counterpart?.profile?.display_name || counterpart?.profile?.email || initialCounterpartName || "Conversation";

	const counterpartReadAtMs = counterpart?.last_read_at ? new Date(counterpart.last_read_at).getTime() : 0;

	const loadMessages = useCallback(async () => {
		setLoading(true);
		setError(null);
		const response = await fetch(`/api/messages/conversations/${conversationId}/messages?limit=60`, {
			method: "GET",
		}).catch(() => null);
		if (!response?.ok) {
			setError(locale === "id" ? "Gagal memuat pesan." : "Could not load messages.");
			setMessages([]);
			setParticipants([]);
			setLoading(false);
			return;
		}
		const body = (await response.json().catch(() => ({}))) as ThreadResponse;
		setMessages(Array.isArray(body.messages) ? body.messages : []);
		setParticipants(Array.isArray(body.participants) ? body.participants : []);
		setLoading(false);
	}, [conversationId, locale]);

	const markRead = useCallback(async () => {
		await fetch(`/api/messages/conversations/${conversationId}/read`, { method: "PATCH" }).catch(() => null);
	}, [conversationId]);

	useEffect(() => {
		void loadMessages().then(() => void markRead());
	}, [loadMessages, markRead]);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const messageChannel = supabase
			.channel(`dm-thread:${conversationId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
				() => {
					void loadMessages().then(() => void markRead());
				},
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "dm_participants", filter: `conversation_id=eq.${conversationId}` },
				() => {
					void loadMessages();
				},
			)
			.subscribe();

		const typingChannel = supabase.channel(`dm-typing-${conversationId}`);
		typingChannel
			.on("broadcast", { event: "typing" }, ({ payload }) => {
				const userId = typeof payload?.userId === "string" ? payload.userId : "";
				if (!userId || userId === currentUserId) return;
				typingStatesRef.current[userId] = Date.now();
				const activeCount = Object.values(typingStatesRef.current).filter((at) => Date.now() - at <= 4000).length;
				setTypingCount(activeCount);
			})
			.subscribe();

		const interval = setInterval(() => {
			const activeCount = Object.values(typingStatesRef.current).filter((at) => Date.now() - at <= 4000).length;
			setTypingCount(activeCount);
		}, 1000);

		return () => {
			clearInterval(interval);
			void supabase.removeChannel(messageChannel);
			void supabase.removeChannel(typingChannel);
		};
	}, [conversationId, currentUserId, loadMessages, markRead]);

	async function sendMessage() {
		setSending(true);
		setError(null);
		const endpoint = editingMessageId
			? `/api/messages/messages/${editingMessageId}`
			: `/api/messages/conversations/${conversationId}/messages`;
		const method = editingMessageId ? "PATCH" : "POST";
		const response = await fetch(endpoint, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ body_html: composerHtml }),
		}).catch(() => null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string; details?: string }) : null;
			setError(body?.details || body?.error || (locale === "id" ? "Gagal mengirim pesan." : "Could not send message."));
			setSending(false);
			return;
		}
		setComposerHtml("<p></p>");
		setEditingMessageId(null);
		setSending(false);
		await loadMessages();
		await markRead();
	}

	async function deleteMessage(messageId: string) {
		setError(null);
		const response = await fetch(`/api/messages/messages/${messageId}`, { method: "DELETE" }).catch(() => null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string; details?: string }) : null;
			setError(body?.details || body?.error || (locale === "id" ? "Gagal menghapus pesan." : "Could not delete message."));
			return;
		}
		await loadMessages();
	}

	async function submitReport() {
		if (!reportMessageId) return;
		setReporting(true);
		setError(null);
		const response = await fetch("/api/messages/reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				conversationId,
				messageId: reportMessageId,
				reason: reportReason.trim() || "Abusive content",
				detail: reportDetail.trim() || undefined,
			}),
		}).catch(() => null);
		if (!response?.ok) {
			setError(locale === "id" ? "Gagal mengirim laporan." : "Could not submit report.");
			setReporting(false);
			return;
		}
		setReportOpen(false);
		setReportMessageId(null);
		setReportReason("");
		setReportDetail("");
		setReporting(false);
	}

	function handleComposerChange(nextHtml: string) {
		setComposerHtml(nextHtml);

		const now = Date.now();
		if (now - typingSentAtRef.current < 1200) return;
		typingSentAtRef.current = now;
		const supabase = createSupabaseBrowserClient();
		const channel = supabase.channel(`dm-typing-${conversationId}`);
		channel.subscribe((status) => {
			if (status !== "SUBSCRIBED") return;
			void channel.send({
				type: "broadcast",
				event: "typing",
				payload: {
					userId: currentUserId,
				},
			});
			setTimeout(() => {
				void supabase.removeChannel(channel);
			}, 300);
		});
	}

	return (
		<div className="grid gap-4">
			<header className="rounded-2xl border bg-(--surface-elevated) p-4">
				<h1 className="font-heading text-2xl text-(--espresso)">{counterpartName}</h1>
				<p className="text-sm text-(--muted)">
					{typingCount > 0
						? locale === "id"
							? `${typingCount} pengguna sedang mengetik...`
							: `${typingCount} user${typingCount > 1 ? "s are" : " is"} typing...`
						: locale === "id"
							? "Percakapan pribadi"
							: "Private conversation"}
				</p>
			</header>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

			<div className="max-h-[58dvh] space-y-3 overflow-y-auto rounded-2xl border bg-(--surface) p-3">
				{loading ? (
					<p className="inline-flex items-center gap-2 text-sm text-(--muted)">
						<Loader2 size={14} className="animate-spin" />
						{locale === "id" ? "Memuat pesan..." : "Loading messages..."}
					</p>
				) : messages.length === 0 ? (
					<p className="text-sm text-(--muted)">{locale === "id" ? "Belum ada pesan." : "No messages yet."}</p>
				) : (
					messages.map((message) => {
						const mine = message.sender_id === currentUserId;
						const readByCounterpart =
							mine && counterpartReadAtMs > 0 && new Date(message.created_at).getTime() <= counterpartReadAtMs;
						return (
							<article
								key={message.id}
								className={cn(
									"max-w-[85%] rounded-2xl border px-3 py-2 text-sm",
									mine ? "ml-auto bg-(--surface-elevated)" : "mr-auto bg-(--surface)",
								)}
							>
								<div className="prose prose-sm max-w-none text-foreground">
									<RichTextContent html={message.body_html} />
								</div>
								<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-(--muted)">
									<span>{formatDate(message.created_at, locale)}</span>
									{message.edited_at ? <span>{locale === "id" ? "diedit" : "edited"}</span> : null}
									{mine ? <span>{readByCounterpart ? (locale === "id" ? "dibaca" : "read") : "sent"}</span> : null}
								</div>
								<div className="mt-2 flex items-center gap-2">
									{mine ? (
										<>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => {
													setEditingMessageId(message.id);
													setComposerHtml(message.body_html);
												}}
											>
												<Pencil size={13} />
											</Button>
											<Button type="button" size="sm" variant="ghost" onClick={() => void deleteMessage(message.id)}>
												<Trash2 size={13} />
											</Button>
										</>
									) : (
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onClick={() => {
												setReportMessageId(message.id);
												setReportOpen(true);
											}}
										>
											<Flag size={13} />
										</Button>
									)}
								</div>
							</article>
						);
					})
				)}
			</div>

			<div className="grid gap-2 rounded-2xl border bg-(--surface-elevated) p-3">
				<RichTextEditor
					value={composerHtml}
					onChange={handleComposerChange}
					enableImageUpload
					imageUploadEndpoint="/api/messages/media"
					minPlainTextLength={0}
					maxPlainTextLength={12000}
				/>
				<div className="flex items-center justify-between gap-2">
					{editingMessageId ? (
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								setEditingMessageId(null);
								setComposerHtml("<p></p>");
							}}
						>
							{locale === "id" ? "Batal edit" : "Cancel edit"}
						</Button>
					) : (
						<span />
					)}
					<Button type="button" onClick={() => void sendMessage()} disabled={sending}>
						{sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
						<span className="ml-1">
							{editingMessageId ? (locale === "id" ? "Simpan" : "Save") : locale === "id" ? "Kirim" : "Send"}
						</span>
					</Button>
				</div>
			</div>

			<FormModal
				open={reportOpen}
				onClose={() => {
					if (reporting) return;
					setReportOpen(false);
					setReportMessageId(null);
				}}
				title={locale === "id" ? "Laporkan Pesan" : "Report Message"}
				description={
					locale === "id"
						? "Laporan akan dikirim ke moderator untuk ditinjau."
						: "Your report will be sent to moderators for review."
				}
				footer={
					<div className="flex items-center justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setReportOpen(false)} disabled={reporting}>
							{locale === "id" ? "Batal" : "Cancel"}
						</Button>
						<Button type="button" onClick={() => void submitReport()} disabled={reporting || !reportMessageId}>
							{reporting ? <Loader2 size={14} className="animate-spin" /> : null}
							<span className="ml-1">{locale === "id" ? "Kirim Laporan" : "Submit Report"}</span>
						</Button>
					</div>
				}
			>
				<div className="grid gap-3">
					<div>
						<label htmlFor="dm-report-reason" className="mb-1 block text-sm font-semibold">
							{locale === "id" ? "Alasan" : "Reason"}
						</label>
						<Input
							id="dm-report-reason"
							value={reportReason}
							onChange={(event) => setReportReason(event.currentTarget.value)}
							placeholder={locale === "id" ? "Contoh: pelecehan, spam, ancaman" : "Example: harassment, spam, threat"}
						/>
					</div>
					<div>
						<label htmlFor="dm-report-detail" className="mb-1 block text-sm font-semibold">
							{locale === "id" ? "Detail (opsional)" : "Details (optional)"}
						</label>
						<textarea
							id="dm-report-detail"
							value={reportDetail}
							onChange={(event) => setReportDetail(event.currentTarget.value)}
							className="min-h-24 w-full rounded-lg border bg-(--surface) px-3 py-2 text-sm"
						/>
					</div>
				</div>
			</FormModal>
		</div>
	);
}
