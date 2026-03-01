"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { EllipsisVertical, Flag, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { sanitizeForStorage, toPlainText } from "@/lib/rich-text";
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
	has_more?: boolean;
	next_cursor?: string | null;
}

interface MessageThreadProps {
	conversationId: string;
	currentUserId: string;
	initialCounterpartName: string;
	locale: "en" | "id";
	onBack?: () => void;
}

interface ThreadHeaderProps {
	counterpartAvatarUrl: string | null;
	counterpartName: string;
	counterpartVerified: boolean;
	isTyping: boolean;
	lastSeenAt: string | null;
	locale: "en" | "id";
	onBack?: () => void;
}

interface ThreadTimelineProps {
	currentUserId: string;
	counterpartReadAtMs: number;
	hasMore: boolean;
	isTyping: boolean;
	loading: boolean;
	loadingOlder: boolean;
	locale: "en" | "id";
	messages: ThreadMessage[];
	onDelete: (messageId: string) => Promise<void>;
	onEdit: (message: ThreadMessage) => void;
	onLoadOlder: () => Promise<void>;
	onReport: (messageId: string) => void;
}

interface ThreadComposerProps {
	canSend: boolean;
	composerText: string;
	editingMessageId: string | null;
	locale: "en" | "id";
	onCancelEdit: () => void;
	onChange: (nextText: string) => void;
	onSend: () => Promise<void>;
	sending: boolean;
}

type RealtimeRow = Record<string, unknown> | null | undefined;

function getRealtimeString(row: RealtimeRow, key: string) {
	if (!row || typeof row !== "object") return null;
	const value = row[key];
	return typeof value === "string" ? value : null;
}

function toInitial(name: string) {
	const first = name.trim().charAt(0).toUpperCase();
	return first || "U";
}

function mergeUniqueMessages(current: ThreadMessage[], nextRows: ThreadMessage[]) {
	const map = new Map<string, ThreadMessage>();
	for (const message of current) {
		map.set(message.id, message);
	}
	for (const message of nextRows) {
		map.set(message.id, message);
	}
	return Array.from(map.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function TypingDots({ className }: { className?: string }) {
	return (
		<span className={cn("inline-flex items-center gap-1", className)} aria-hidden="true">
			<span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce [animation-delay:0ms]" />
			<span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce [animation-delay:140ms]" />
			<span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce [animation-delay:280ms]" />
		</span>
	);
}

export function ThreadHeader({
	counterpartAvatarUrl,
	counterpartName,
	counterpartVerified,
	isTyping,
	lastSeenAt,
	locale,
	onBack,
}: ThreadHeaderProps) {
	const presenceText = isTyping
		? locale === "id"
			? "sedang mengetik..."
			: "typing..."
		: lastSeenAt
			? locale === "id"
				? `Terakhir aktif ${formatDate(lastSeenAt, locale)}`
				: `Last seen ${formatDate(lastSeenAt, locale)}`
			: locale === "id"
				? "Percakapan pribadi"
				: "Private conversation";

	return (
		<header className="sticky top-0 z-20 border-b border-(--border) bg-(--surface-elevated)/95 px-3 py-2.5 backdrop-blur-sm sm:px-4">
			<div className="flex items-center gap-2">
				{onBack ? (
					<Button type="button" variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
						<span className="sr-only">{locale === "id" ? "Kembali" : "Back"}</span>←
					</Button>
				) : null}
				<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-(--sand)/20 text-sm font-semibold text-(--espresso)">
					{counterpartAvatarUrl ? (
						// biome-ignore lint/performance/noImgElement: avatar URL may be remote Supabase storage path
						<img src={counterpartAvatarUrl} alt={counterpartName} className="h-full w-full object-cover" />
					) : (
						toInitial(counterpartName)
					)}
				</span>
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-1.5">
						<p className="truncate text-sm font-semibold text-(--espresso)">{counterpartName}</p>
						{counterpartVerified ? <VerifiedBadge className="shrink-0" /> : null}
					</div>
					<p className={cn("truncate text-xs", isTyping ? "text-(--accent)" : "text-(--muted)")}>
						{isTyping ? <TypingDots className="mr-1.5 align-middle" /> : null}
						{presenceText}
					</p>
				</div>
			</div>
		</header>
	);
}

export function ThreadTimeline({
	currentUserId,
	counterpartReadAtMs,
	hasMore,
	isTyping,
	loading,
	loadingOlder,
	locale,
	messages,
	onDelete,
	onEdit,
	onLoadOlder,
	onReport,
}: ThreadTimelineProps) {
	const [menuMessageId, setMenuMessageId] = useState<string | null>(null);

	useEffect(() => {
		if (!menuMessageId) return;
		const closeMenu = () => setMenuMessageId(null);
		document.addEventListener("click", closeMenu);
		return () => {
			document.removeEventListener("click", closeMenu);
		};
	}, [menuMessageId]);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[linear-gradient(160deg,color-mix(in_oklab,var(--sand)_10%,transparent),transparent_45%)] p-3 sm:p-4">
			<div className="mb-2 flex justify-center">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void onLoadOlder()}
					disabled={loadingOlder || !hasMore}
				>
					{loadingOlder ? <Loader2 size={14} className="animate-spin" /> : null}
					<span className="ml-1">
						{hasMore
							? locale === "id"
								? "Muat pesan lebih lama"
								: "Load older messages"
							: locale === "id"
								? "Semua pesan sudah dimuat"
								: "All messages loaded"}
					</span>
				</Button>
			</div>

			{loading ? (
				<p className="inline-flex items-center gap-2 py-4 text-sm text-(--muted)">
					<Loader2 size={14} className="animate-spin" />
					{locale === "id" ? "Memuat pesan..." : "Loading messages..."}
				</p>
			) : messages.length === 0 ? (
				<p className="py-4 text-sm text-(--muted)">{locale === "id" ? "Belum ada pesan." : "No messages yet."}</p>
			) : (
				<div className="space-y-2.5">
					{messages.map((message, index) => {
						const mine = message.sender_id === currentUserId;
						const readByCounterpart =
							mine && counterpartReadAtMs > 0 && new Date(message.created_at).getTime() <= counterpartReadAtMs;
						const currentDay = new Date(message.created_at).toDateString();
						const previousDay = index > 0 ? new Date(messages[index - 1]?.created_at ?? "").toDateString() : null;
						const showDayDivider = index === 0 || previousDay !== currentDay;
						const showMenu = menuMessageId === message.id;
						const standaloneAttachments = message.attachments.filter(
							(attachment) => !message.body_html.includes(attachment.public_url),
						);

						return (
							<div key={message.id}>
								{showDayDivider ? (
									<div className="my-2 flex justify-center">
										<span className="rounded-full border border-(--border) bg-(--surface-elevated) px-3 py-0.5 text-[11px] text-(--muted)">
											{formatDate(message.created_at, locale)}
										</span>
									</div>
								) : null}

								<article className={cn("group flex", mine ? "justify-end" : "justify-start")}>
									<div
										className={cn(
											"relative max-w-[86%] rounded-2xl border px-3 py-2 shadow-sm sm:max-w-[75%]",
											mine
												? "border-(--border) bg-[color-mix(in_oklab,var(--accent)_22%,var(--surface))]"
												: "border-(--border) bg-(--surface)",
										)}
									>
										<div className="prose prose-sm max-w-none text-foreground">
											<RichTextContent html={message.body_html} />
										</div>

										{standaloneAttachments.length > 0 ? (
											<div className="mt-2 grid gap-2 sm:grid-cols-2">
												{standaloneAttachments.map((attachment) => (
													<a
														key={attachment.id}
														href={attachment.public_url}
														target="_blank"
														rel="noopener noreferrer"
														className="overflow-hidden rounded-lg border"
													>
														{/* biome-ignore lint/performance/noImgElement: attachment URLs are remote/public */}
														<img src={attachment.public_url} alt="message attachment" className="h-28 w-full object-cover" />
													</a>
												))}
											</div>
										) : null}

										<div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-(--muted)">
											<span className="truncate">
												{formatDate(message.created_at, locale)}
												{message.edited_at ? ` • ${locale === "id" ? "diedit" : "edited"}` : ""}
											</span>
											{mine ? <span>{readByCounterpart ? (locale === "id" ? "dibaca" : "read") : "sent"}</span> : <span />}
										</div>

										<button
											type="button"
											className="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-(--surface-elevated)/80 text-(--muted) opacity-0 transition hover:border-(--border) hover:text-foreground group-hover:opacity-100"
											onClick={() => setMenuMessageId((current) => (current === message.id ? null : message.id))}
											aria-label={locale === "id" ? "Aksi pesan" : "Message actions"}
										>
											<EllipsisVertical size={14} />
										</button>

										{showMenu ? (
											<div className="absolute top-8 right-2 z-20 min-w-36 rounded-lg border border-(--border) bg-(--surface-elevated) p-1 shadow-lg">
												{mine ? (
													<>
														<button
															type="button"
															className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-(--sand)/20"
															onClick={() => {
																setMenuMessageId(null);
																onEdit(message);
															}}
														>
															<Pencil size={12} />
															{locale === "id" ? "Edit" : "Edit"}
														</button>
														<button
															type="button"
															className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-(--danger) transition hover:bg-(--danger)/10"
															onClick={() => {
																setMenuMessageId(null);
																void onDelete(message.id);
															}}
														>
															<Trash2 size={12} />
															{locale === "id" ? "Hapus" : "Delete"}
														</button>
													</>
												) : (
													<button
														type="button"
														className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-(--sand)/20"
														onClick={() => {
															setMenuMessageId(null);
															onReport(message.id);
														}}
													>
														<Flag size={12} />
														{locale === "id" ? "Laporkan" : "Report"}
													</button>
												)}
											</div>
										) : null}
									</div>
								</article>
							</div>
						);
					})}

					{isTyping ? (
						<article className="flex justify-start">
							<div className="inline-flex max-w-[70%] items-center gap-2 rounded-2xl border border-(--border) bg-(--surface) px-3 py-2 text-xs text-(--muted)">
								<TypingDots className="text-(--muted)" />
								<span>{locale === "id" ? "sedang mengetik..." : "typing..."}</span>
							</div>
						</article>
					) : null}
				</div>
			)}
		</div>
	);
}

export function ThreadComposer({
	canSend,
	composerText,
	editingMessageId,
	locale,
	onCancelEdit,
	onChange,
	onSend,
	sending,
}: ThreadComposerProps) {
	const placeholder = locale === "id" ? "Ketik pesan..." : "Type a message...";

	return (
		<div className="sticky bottom-0 z-20 shrink-0 border-t border-(--border) bg-(--surface-elevated)/95 p-2 backdrop-blur-sm sm:p-3">
			<div className="rounded-xl border border-(--border) bg-(--surface) p-2.5">
				<div className="flex items-end gap-2">
					<textarea
						value={composerText}
						onChange={(event) => onChange(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key !== "Enter" || event.shiftKey) return;
							event.preventDefault();
							void onSend();
						}}
						placeholder={placeholder}
						rows={1}
						className="max-h-36 min-h-10 w-full resize-y rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-(--accent)/40"
					/>
					<Button type="button" size="sm" onClick={() => void onSend()} disabled={sending || !canSend}>
						{sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
						<span className="ml-1">
							{editingMessageId ? (locale === "id" ? "Simpan" : "Save") : locale === "id" ? "Kirim" : "Send"}
						</span>
					</Button>
				</div>
				<div className="mt-2 flex items-center justify-between gap-2">
					{editingMessageId ? (
						<Button type="button" size="sm" variant="ghost" onClick={onCancelEdit}>
							{locale === "id" ? "Batal edit" : "Cancel edit"}
						</Button>
					) : (
						<p className="text-[11px] text-(--muted)">
							{locale === "id" ? "Enter untuk kirim, Shift+Enter baris baru" : "Enter to send, Shift+Enter for new line"}
						</p>
					)}
					<span className="text-[11px] text-(--muted)">{composerText.trim().length}/12000</span>
				</div>
			</div>
		</div>
	);
}

export function MessageThread({
	conversationId,
	currentUserId,
	initialCounterpartName,
	locale,
	onBack,
}: MessageThreadProps) {
	const [messages, setMessages] = useState<ThreadMessage[]>([]);
	const [participants, setParticipants] = useState<ThreadParticipant[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [sending, setSending] = useState(false);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const [composerText, setComposerText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [typingCount, setTypingCount] = useState(0);
	const typingSentAtRef = useRef(0);
	const typingStatesRef = useRef<Record<string, number>>({});
	const typingActiveRef = useRef(false);
	const messageChannelRef = useRef<RealtimeChannel | null>(null);
	const typingChannelRef = useRef<RealtimeChannel | null>(null);
	const typingChannelSubscribedRef = useRef(false);
	const subscriptionGenerationRef = useRef(0);
	const [reportOpen, setReportOpen] = useState(false);
	const [reportMessageId, setReportMessageId] = useState<string | null>(null);
	const [reportReason, setReportReason] = useState("");
	const [reportDetail, setReportDetail] = useState("");
	const [reporting, setReporting] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const silentReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const counterpart = useMemo(
		() => participants.find((participant) => participant.user_id !== currentUserId) ?? null,
		[participants, currentUserId],
	);
	const counterpartName =
		counterpart?.profile?.display_name || counterpart?.profile?.email || initialCounterpartName || "Conversation";
	const counterpartAvatarUrl = counterpart?.profile?.avatar_url ?? null;
	const counterpartVerified = Boolean(counterpart?.profile?.is_verified);
	const counterpartLastSeenAt = counterpart?.last_seen_at ?? null;
	const counterpartReadAtMs = counterpart?.last_read_at ? new Date(counterpart.last_read_at).getTime() : 0;
	const composerPlainLength = composerText.trim().length;
	const canSend = composerPlainLength > 0 && composerPlainLength <= 12000;

	const loadMessages = useCallback(
		async ({
			appendOlder,
			cursor,
			silent = false,
		}: {
			appendOlder: boolean;
			cursor?: string | null;
			silent?: boolean;
		}) => {
			if (appendOlder) {
				setLoadingOlder(true);
			} else if (!silent) {
				setLoading(true);
			}
			setError(null);

			const response = await fetch(
				`/api/messages/conversations/${conversationId}/messages?limit=40${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
				{ method: "GET" },
			).catch(() => null);

			if (!response?.ok) {
				setError(locale === "id" ? "Gagal memuat pesan." : "Could not load messages.");
				if (!appendOlder) {
					setMessages([]);
					setParticipants([]);
					setHasMore(false);
					setNextCursor(null);
				}
				setLoading(false);
				setLoadingOlder(false);
				return;
			}

			const body = (await response.json().catch(() => ({}))) as ThreadResponse;
			const nextRows = Array.isArray(body.messages) ? body.messages : [];
			const nextParticipants = Array.isArray(body.participants) ? body.participants : [];
			setParticipants(nextParticipants);
			setHasMore(Boolean(body.has_more));
			setNextCursor(typeof body.next_cursor === "string" ? body.next_cursor : null);
			setMessages((current) => (appendOlder ? mergeUniqueMessages(nextRows, current) : mergeUniqueMessages([], nextRows)));
			setLoading(false);
			setLoadingOlder(false);
		},
		[conversationId, locale],
	);

	const markRead = useCallback(async () => {
		await fetch(`/api/messages/conversations/${conversationId}/read`, { method: "PATCH" }).catch(() => null);
	}, [conversationId]);

	const queueSilentReload = useCallback(
		(withMarkRead: boolean) => {
			if (silentReloadTimeoutRef.current) {
				clearTimeout(silentReloadTimeoutRef.current);
			}
			silentReloadTimeoutRef.current = setTimeout(() => {
				silentReloadTimeoutRef.current = null;
				void loadMessages({ appendOlder: false, silent: true }).then(() => {
					if (!withMarkRead) return;
					void markRead();
				});
			}, 120);
		},
		[loadMessages, markRead],
	);

	const sendTypingSignal = useCallback(
		(isTyping: boolean) => {
			if (!typingChannelRef.current || !typingChannelSubscribedRef.current) {
				return;
			}
			void typingChannelRef.current.send({
				type: "broadcast",
				event: "typing",
				payload: { userId: currentUserId, isTyping },
			});
		},
		[currentUserId],
	);

	useEffect(() => {
		void loadMessages({ appendOlder: false }).then(() => void markRead());
	}, [loadMessages, markRead]);

	useEffect(() => {
		subscriptionGenerationRef.current += 1;
		const generation = subscriptionGenerationRef.current;
		const supabase = createSupabaseBrowserClient();

		if (messageChannelRef.current) {
			void supabase.removeChannel(messageChannelRef.current);
			messageChannelRef.current = null;
		}
		if (typingChannelRef.current) {
			void supabase.removeChannel(typingChannelRef.current);
			typingChannelRef.current = null;
		}
		typingChannelSubscribedRef.current = false;
		typingStatesRef.current = {};
		setTypingCount(0);

		const messageChannel = supabase
			.channel(`dm-thread:${conversationId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
				(payload) => {
					if (generation !== subscriptionGenerationRef.current) return;
					const eventType = (payload as RealtimePostgresChangesPayload<Record<string, unknown>>).eventType;
					queueSilentReload(eventType === "INSERT");
				},
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "dm_participants", filter: `conversation_id=eq.${conversationId}` },
				(payload) => {
					if (generation !== subscriptionGenerationRef.current) return;

					const typedPayload = payload as RealtimePostgresChangesPayload<Record<string, unknown>>;
					const userId = getRealtimeString(typedPayload.new, "user_id") ?? getRealtimeString(typedPayload.old, "user_id");
					if (!userId) {
						queueSilentReload(false);
						return;
					}

					const nextLastReadAt = getRealtimeString(typedPayload.new, "last_read_at");
					const oldLastReadAt = getRealtimeString(typedPayload.old, "last_read_at");
					const nextLastSeenAt = getRealtimeString(typedPayload.new, "last_seen_at");
					const oldLastSeenAt = getRealtimeString(typedPayload.old, "last_seen_at");

					if ((nextLastReadAt ?? null) === (oldLastReadAt ?? null) && (nextLastSeenAt ?? null) === (oldLastSeenAt ?? null)) {
						return;
					}

					setParticipants((current) =>
						current.map((participant) => {
							if (participant.user_id !== userId) return participant;
							return {
								...participant,
								last_read_at: nextLastReadAt,
								last_seen_at: nextLastSeenAt,
							};
						}),
					);
				},
			)
			.subscribe();
		messageChannelRef.current = messageChannel;

		const typingChannel = supabase.channel(`dm-typing-${conversationId}`);
		typingChannel
			.on("broadcast", { event: "typing" }, ({ payload }) => {
				if (generation !== subscriptionGenerationRef.current) return;
				const userId = typeof payload?.userId === "string" ? payload.userId : "";
				if (!userId || userId === currentUserId) return;
				const isTyping = typeof payload?.isTyping === "boolean" ? payload.isTyping : true;
				if (!isTyping) {
					delete typingStatesRef.current[userId];
				} else {
					typingStatesRef.current[userId] = Date.now();
				}
				const activeCount = Object.values(typingStatesRef.current).filter((at) => Date.now() - at <= 4000).length;
				setTypingCount(activeCount);
			})
			.subscribe((status) => {
				if (generation !== subscriptionGenerationRef.current) return;
				typingChannelSubscribedRef.current = status === "SUBSCRIBED";
			});
		typingChannelRef.current = typingChannel;

		const interval = setInterval(() => {
			if (generation !== subscriptionGenerationRef.current) return;
			const activeCount = Object.values(typingStatesRef.current).filter((at) => Date.now() - at <= 4000).length;
			setTypingCount(activeCount);
		}, 1000);

		return () => {
			subscriptionGenerationRef.current += 1;
			if (typingActiveRef.current) {
				void typingChannel.send({
					type: "broadcast",
					event: "typing",
					payload: { userId: currentUserId, isTyping: false },
				});
				typingActiveRef.current = false;
			}
			clearInterval(interval);
			if (silentReloadTimeoutRef.current) {
				clearTimeout(silentReloadTimeoutRef.current);
				silentReloadTimeoutRef.current = null;
			}
			messageChannelRef.current = null;
			typingChannelRef.current = null;
			typingChannelSubscribedRef.current = false;
			typingStatesRef.current = {};
			void supabase.removeChannel(messageChannel);
			void supabase.removeChannel(typingChannel);
		};
	}, [conversationId, currentUserId, queueSilentReload]);

	async function sendMessage() {
		if (!canSend || sending) return;
		const bodyHtml = sanitizeForStorage(composerText);
		if (toPlainText(bodyHtml).length === 0) return;

		setSending(true);
		setError(null);
		const endpoint = editingMessageId
			? `/api/messages/messages/${editingMessageId}`
			: `/api/messages/conversations/${conversationId}/messages`;
		const method = editingMessageId ? "PATCH" : "POST";
		const response = await fetch(endpoint, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ body_html: bodyHtml }),
		}).catch(() => null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string; details?: string }) : null;
			setError(body?.details || body?.error || (locale === "id" ? "Gagal mengirim pesan." : "Could not send message."));
			setSending(false);
			return;
		}
		setComposerText("");
		if (typingActiveRef.current) {
			typingActiveRef.current = false;
			sendTypingSignal(false);
		}
		setEditingMessageId(null);
		setSending(false);
		await loadMessages({ appendOlder: false, silent: true });
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
		await loadMessages({ appendOlder: false, silent: true });
	}

	async function loadOlder() {
		if (!hasMore || !nextCursor) return;
		await loadMessages({ appendOlder: true, cursor: nextCursor });
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

	function handleComposerChange(nextText: string) {
		setComposerText(nextText);
		const nextTyping = nextText.trim().length > 0;
		if (nextTyping !== typingActiveRef.current) {
			typingActiveRef.current = nextTyping;
			typingSentAtRef.current = Date.now();
			sendTypingSignal(nextTyping);
			return;
		}
		if (!nextTyping) {
			return;
		}

		const now = Date.now();
		if (now - typingSentAtRef.current < 2000) return;
		typingSentAtRef.current = now;
		sendTypingSignal(true);
	}

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			<ThreadHeader
				counterpartAvatarUrl={counterpartAvatarUrl}
				counterpartName={counterpartName}
				counterpartVerified={counterpartVerified}
				isTyping={typingCount > 0}
				lastSeenAt={counterpartLastSeenAt}
				locale={locale}
				onBack={onBack}
			/>

			{error ? (
				<p className="border-b border-(--danger)/30 bg-(--danger)/10 px-3 py-2 text-sm text-(--danger)">{error}</p>
			) : null}

			<ThreadTimeline
				currentUserId={currentUserId}
				counterpartReadAtMs={counterpartReadAtMs}
				hasMore={hasMore}
				isTyping={typingCount > 0}
				loading={loading}
				loadingOlder={loadingOlder}
				locale={locale}
				messages={messages}
				onDelete={deleteMessage}
				onEdit={(message) => {
					setEditingMessageId(message.id);
					setComposerText(toPlainText(message.body_html));
				}}
				onLoadOlder={loadOlder}
				onReport={(messageId) => {
					setReportMessageId(messageId);
					setReportOpen(true);
				}}
			/>

			<ThreadComposer
				canSend={canSend}
				composerText={composerText}
				editingMessageId={editingMessageId}
				locale={locale}
				onCancelEdit={() => {
					setEditingMessageId(null);
					setComposerText("");
					if (typingActiveRef.current) {
						typingActiveRef.current = false;
						sendTypingSignal(false);
					}
				}}
				onChange={handleComposerChange}
				onSend={sendMessage}
				sending={sending}
			/>

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
