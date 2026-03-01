"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Archive, ArchiveRestore, Loader2, MessageCircle, Search } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageThread } from "@/components/messages/message-thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn, formatDate } from "@/lib/utils";

type InboxView = "active" | "archived";

interface ConversationItem {
	id: string;
	last_message_at: string;
	last_read_at: string | null;
	counterpart: {
		id: string;
		display_name: string;
		email: string | null;
		avatar_url: string | null;
		is_verified: boolean;
	} | null;
	last_message: {
		id: string;
		sender_id: string;
		body_text: string;
		created_at: string;
	} | null;
	unread_hint: boolean;
	unread_count?: number;
}

interface ConversationsResponse {
	conversations?: ConversationItem[];
	unread_count?: number;
	has_more?: boolean;
	next_cursor?: string | null;
}

interface MessagesWorkspaceProps {
	currentUserId: string;
	initialConversationId: string | null;
	initialQuery: string;
	initialView: InboxView;
	locale: "en" | "id";
}

const PAGE_SIZE = 20;
type RealtimeRow = Record<string, unknown> | null | undefined;

function getRealtimeString(row: RealtimeRow, key: string) {
	if (!row || typeof row !== "object") return null;
	const value = row[key];
	return typeof value === "string" ? value : null;
}

function initials(name: string) {
	const first = name.trim().charAt(0).toUpperCase();
	return first || "U";
}

export function MessagesWorkspace({
	currentUserId,
	initialConversationId,
	initialQuery,
	initialView,
	locale,
}: MessagesWorkspaceProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [view, setView] = useState<InboxView>(initialView);
	const [query, setQuery] = useState(initialQuery);
	const [conversations, setConversations] = useState<ConversationItem[]>([]);
	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [workingId, setWorkingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const conversationsRef = useRef<ConversationItem[]>([]);
	const workspaceChannelRef = useRef<RealtimeChannel | null>(null);
	const workspaceSubscriptionGenerationRef = useRef(0);
	const selectedConversationIdRef = useRef<string | null>(initialConversationId);

	useEffect(() => {
		selectedConversationIdRef.current = selectedConversationId;
	}, [selectedConversationId]);

	useEffect(() => {
		conversationsRef.current = conversations;
	}, [conversations]);

	const copy = useMemo(
		() => ({
			title: locale === "id" ? "Pesan" : "Messages",
			subtitle:
				locale === "id"
					? "Percakapan langsung Anda diperbarui real-time."
					: "Your direct conversations update in real time.",
			searchPlaceholder: locale === "id" ? "Cari percakapan..." : "Search conversations...",
			active: locale === "id" ? "Aktif" : "Active",
			archived: locale === "id" ? "Arsip" : "Archived",
			unread: locale === "id" ? "Belum dibaca" : "Unread",
			noActive: locale === "id" ? "Belum ada percakapan aktif." : "No active conversations yet.",
			noArchived: locale === "id" ? "Belum ada percakapan arsip." : "No archived conversations yet.",
			openThreadHint: locale === "id" ? "Pilih percakapan untuk mulai chat." : "Select a conversation to start chatting.",
			back: locale === "id" ? "Kembali" : "Back",
			loadMore: locale === "id" ? "Muat lebih banyak" : "Load more",
			archive: locale === "id" ? "Arsipkan" : "Archive",
			restore: locale === "id" ? "Pulihkan" : "Restore",
			loading: locale === "id" ? "Memuat percakapan..." : "Loading conversations...",
			emptyMessage: locale === "id" ? "Belum ada pesan." : "No messages yet.",
		}),
		[locale],
	);

	const selectedConversation = useMemo(
		() => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
		[conversations, selectedConversationId],
	);

	const syncUrl = useCallback(
		(next: { c?: string | null; q?: string; view?: InboxView }) => {
			const params = new URLSearchParams(searchParams.toString());
			const nextConversationId = next.c !== undefined ? next.c : selectedConversationId;
			const nextQuery = next.q !== undefined ? next.q : query;
			const nextView = next.view !== undefined ? next.view : view;

			if (nextConversationId) params.set("c", nextConversationId);
			else params.delete("c");

			const trimmedQuery = nextQuery.trim();
			if (trimmedQuery.length > 0) params.set("q", trimmedQuery);
			else params.delete("q");

			if (nextView === "archived") params.set("view", "archived");
			else params.delete("view");

			const target = params.toString().length > 0 ? `${pathname}?${params.toString()}` : pathname;
			router.replace(target, { scroll: false });
		},
		[pathname, query, router, searchParams, selectedConversationId, view],
	);

	const loadConversations = useCallback(
		async ({ reset, cursor, silent = false }: { cursor?: string | null; reset: boolean; silent?: boolean }) => {
			if (reset) {
				if (!silent && conversationsRef.current.length === 0) {
					setLoading(true);
				}
			} else {
				setLoadingMore(true);
			}
			setError(null);

			const targetCursor = reset ? null : cursor;
			const response = await fetch(
				`/api/messages/conversations?view=${view}&q=${encodeURIComponent(query.trim())}&limit=${PAGE_SIZE}${targetCursor ? `&cursor=${encodeURIComponent(targetCursor)}` : ""}`,
				{ method: "GET" },
			).catch(() => null);

			if (!response?.ok) {
				setError(locale === "id" ? "Gagal memuat percakapan." : "Could not load conversations.");
				if (reset) {
					setConversations([]);
					setUnreadCount(0);
					setHasMore(false);
					setNextCursor(null);
				}
				setLoading(false);
				setLoadingMore(false);
				return;
			}

			const body = (await response.json().catch(() => ({}))) as ConversationsResponse;
			const nextRows = Array.isArray(body.conversations) ? body.conversations : [];
			setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
			setHasMore(Boolean(body.has_more));
			setNextCursor(typeof body.next_cursor === "string" ? body.next_cursor : null);
			setConversations((current) => (reset ? nextRows : [...current, ...nextRows]));
			setLoading(false);
			setLoadingMore(false);
		},
		[locale, query, view],
	);

	const moveConversationToTop = useCallback((target: ConversationItem, previous: ConversationItem[]) => {
		const withoutTarget = previous.filter((conversation) => conversation.id !== target.id);
		return [target, ...withoutTarget];
	}, []);

	const patchConversationByMessage = useCallback(
		(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
			const nextRow = payload.new;
			const oldRow = payload.old;
			const eventType = payload.eventType;

			const conversationIdRaw =
				getRealtimeString(nextRow, "conversation_id") ?? getRealtimeString(oldRow, "conversation_id");
			if (!conversationIdRaw) return;

			if (eventType === "DELETE") {
				setConversations((current) => {
					const activeConversation = current.find((conversation) => conversation.id === conversationIdRaw);
					if (!activeConversation?.last_message?.id) return current;
					const deletedMessageId = getRealtimeString(oldRow, "id");
					if (!deletedMessageId || activeConversation.last_message.id !== deletedMessageId) return current;
					void loadConversations({ reset: true, silent: true });
					return current;
				});
				return;
			}

			if (eventType === "INSERT") {
				const senderId = getRealtimeString(nextRow, "sender_id");
				const createdAt = getRealtimeString(nextRow, "created_at");
				const bodyText = getRealtimeString(nextRow, "body_text") ?? "";
				const messageId = getRealtimeString(nextRow, "id");

				if (!senderId || !createdAt || !messageId) {
					void loadConversations({ reset: true, silent: true });
					return;
				}

				let foundConversation = false;
				const incrementUnread =
					senderId !== currentUserId && selectedConversationIdRef.current !== conversationIdRaw && view === "active";

				setConversations((current) => {
					const patched = current.map((conversation) => {
						if (conversation.id !== conversationIdRaw) return conversation;
						foundConversation = true;
						const nextUnreadCount = Math.max(0, (conversation.unread_count ?? 0) + (incrementUnread ? 1 : 0));
						return {
							...conversation,
							last_message_at: createdAt,
							last_message: {
								id: messageId,
								sender_id: senderId,
								body_text: bodyText,
								created_at: createdAt,
							},
							unread_count: nextUnreadCount,
							unread_hint: nextUnreadCount > 0,
						};
					});
					if (!foundConversation) return current;
					const target = patched.find((conversation) => conversation.id === conversationIdRaw);
					if (!target) return patched;
					return moveConversationToTop(target, patched);
				});

				if (!foundConversation) {
					void loadConversations({ reset: true, silent: true });
					return;
				}

				if (incrementUnread) {
					setUnreadCount((current) => current + 1);
				}
				return;
			}

			if (eventType === "UPDATE") {
				const messageId = getRealtimeString(nextRow, "id");
				const bodyText = getRealtimeString(nextRow, "body_text");
				if (!messageId || bodyText === null) {
					void loadConversations({ reset: true, silent: true });
					return;
				}

				setConversations((current) =>
					current.map((conversation) => {
						if (conversation.id !== conversationIdRaw) return conversation;
						const existingLastMessage = conversation.last_message;
						if (!existingLastMessage || existingLastMessage.id !== messageId) return conversation;
						return {
							...conversation,
							last_message: {
								...existingLastMessage,
								body_text: bodyText,
							},
						};
					}),
				);
			}
		},
		[currentUserId, loadConversations, moveConversationToTop, view],
	);

	const patchConversationByParticipant = useCallback(
		(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
			const eventType = payload.eventType;
			const nextRow = payload.new;
			const oldRow = payload.old;

			const conversationId = getRealtimeString(nextRow, "conversation_id") ?? getRealtimeString(oldRow, "conversation_id");
			if (!conversationId) return;

			if (eventType !== "UPDATE") {
				void loadConversations({ reset: true, silent: true });
				return;
			}

			const nextArchivedAt = getRealtimeString(nextRow, "archived_at");
			const oldArchivedAt = getRealtimeString(oldRow, "archived_at");
			if ((nextArchivedAt ?? null) !== (oldArchivedAt ?? null)) {
				void loadConversations({ reset: true, silent: true });
				return;
			}

			const nextLastReadAt = getRealtimeString(nextRow, "last_read_at");
			const oldLastReadAt = getRealtimeString(oldRow, "last_read_at");
			if ((nextLastReadAt ?? null) === (oldLastReadAt ?? null)) {
				return;
			}

			let clearedUnread = 0;
			setConversations((current) => {
				const patched = current.map((conversation) => {
					if (conversation.id !== conversationId) return conversation;
					clearedUnread = conversation.unread_count ?? (conversation.unread_hint ? 1 : 0);
					return {
						...conversation,
						last_read_at: nextLastReadAt,
						unread_count: 0,
						unread_hint: false,
					};
				});
				return patched;
			});
			if (clearedUnread > 0) {
				setUnreadCount((value) => Math.max(0, value - clearedUnread));
			}
		},
		[loadConversations],
	);

	useEffect(() => {
		const handle = setTimeout(() => {
			void loadConversations({ reset: true });
		}, 220);
		return () => clearTimeout(handle);
	}, [loadConversations]);

	useEffect(() => {
		const currentQuery = searchParams.get("q") ?? "";
		const trimmedQuery = query.trim();
		if (currentQuery === trimmedQuery) {
			return;
		}
		const handle = setTimeout(() => {
			syncUrl({ q: query });
		}, 220);
		return () => clearTimeout(handle);
	}, [query, searchParams, syncUrl]);

	useEffect(() => {
		workspaceSubscriptionGenerationRef.current += 1;
		const generation = workspaceSubscriptionGenerationRef.current;
		const supabase = createSupabaseBrowserClient();
		if (workspaceChannelRef.current) {
			void supabase.removeChannel(workspaceChannelRef.current);
			workspaceChannelRef.current = null;
		}
		const channel = supabase
			.channel(`dm-workspace:${currentUserId}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, (payload) => {
				if (generation !== workspaceSubscriptionGenerationRef.current) return;
				patchConversationByMessage(payload as RealtimePostgresChangesPayload<Record<string, unknown>>);
			})
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "dm_participants", filter: `user_id=eq.${currentUserId}` },
				(payload) => {
					if (generation !== workspaceSubscriptionGenerationRef.current) return;
					patchConversationByParticipant(payload as RealtimePostgresChangesPayload<Record<string, unknown>>);
				},
			)
			.subscribe();
		workspaceChannelRef.current = channel;

		return () => {
			workspaceSubscriptionGenerationRef.current += 1;
			workspaceChannelRef.current = null;
			void supabase.removeChannel(channel);
		};
	}, [currentUserId, patchConversationByMessage, patchConversationByParticipant]);

	useEffect(() => {
		const currentView = searchParams.get("view");
		const currentQuery = searchParams.get("q") ?? "";
		const currentConversationId = searchParams.get("c");
		if (currentView === "archived" && view !== "archived") {
			setView("archived");
		}
		if (currentView !== "archived" && view !== "active") {
			setView("active");
		}
		if (currentQuery !== query) {
			setQuery(currentQuery);
		}
		if ((currentConversationId ?? null) !== selectedConversationId) {
			setSelectedConversationId(currentConversationId);
		}
	}, [query, searchParams, selectedConversationId, view]);

	async function archiveConversation(conversationId: string, archived: boolean) {
		setWorkingId(conversationId);
		setError(null);
		const response = await fetch(`/api/messages/conversations/${conversationId}/archive`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ archived }),
		}).catch(() => null);
		if (!response?.ok) {
			setError(locale === "id" ? "Gagal memperbarui percakapan." : "Could not update conversation.");
			setWorkingId(null);
			return;
		}

		if (archived && selectedConversationId === conversationId && view === "active") {
			setSelectedConversationId(null);
			syncUrl({ c: null });
		}

		await loadConversations({ reset: true });
		setWorkingId(null);
	}

	function selectConversation(conversationId: string) {
		setSelectedConversationId(conversationId);
		syncUrl({ c: conversationId });
	}

	function handleBackToList() {
		setSelectedConversationId(null);
		syncUrl({ c: null });
	}

	return (
		<div className="flex h-[calc(100dvh-6.2rem)] max-h-[calc(100dvh-6.2rem)] w-full min-h-[calc(100dvh-6.2rem)] gap-3 overflow-hidden">
			<aside
				className={cn(
					"flex h-[calc(100dvh-6.2rem)] w-full flex-col overflow-hidden rounded-2xl border bg-(--surface-elevated) shadow-sm lg:w-90 lg:max-w-90 xl:w-97.5 xl:max-w-97.5",
					selectedConversationId ? "hidden lg:flex" : "flex",
				)}
			>
				<div className="space-y-3 border-b border-(--border) p-3 sm:p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h1 className="font-heading text-2xl text-(--espresso)">{copy.title}</h1>
							<p className="text-xs text-(--muted)">
								{copy.subtitle}
								{unreadCount > 0 ? ` • ${unreadCount} ${copy.unread}` : ""}
							</p>
						</div>
						<span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-(--sand)/30 px-2 text-xs font-semibold text-(--espresso)">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant={view === "active" ? "primary" : "outline"}
							onClick={() => {
								setView("active");
								syncUrl({ view: "active" });
							}}
						>
							{copy.active}
						</Button>
						<Button
							type="button"
							size="sm"
							variant={view === "archived" ? "primary" : "outline"}
							onClick={() => {
								setView("archived");
								syncUrl({ view: "archived" });
							}}
						>
							{copy.archived}
						</Button>
					</div>
					<div className="relative">
						<Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--muted)" />
						<Input
							value={query}
							onChange={(event) => {
								const nextValue = event.currentTarget.value;
								setQuery(nextValue);
							}}
							placeholder={copy.searchPlaceholder}
							aria-label={copy.searchPlaceholder}
							className="pl-8"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-2 sm:p-3">
					{error ? <p className="mb-2 px-2 text-sm text-(--danger)">{error}</p> : null}
					{loading ? (
						<p className="inline-flex items-center gap-2 px-2 py-3 text-sm text-(--muted)">
							<Loader2 size={14} className="animate-spin" />
							{copy.loading}
						</p>
					) : conversations.length === 0 ? (
						<p className="px-2 py-3 text-sm text-(--muted)">{view === "active" ? copy.noActive : copy.noArchived}</p>
					) : (
						<div className="space-y-1.5">
							{conversations.map((conversation) => {
								const isActive = conversation.id === selectedConversationId;
								const counterpartName =
									conversation.counterpart?.display_name || conversation.counterpart?.email || "Unknown User";
								return (
									<div
										key={conversation.id}
										className={cn(
											"rounded-xl border border-transparent bg-(--surface) p-2 transition",
											"hover:border-(--border) hover:bg-(--sand)/15",
											isActive && "border-(--border) bg-(--sand)/25",
										)}
									>
										<button
											type="button"
											onClick={() => selectConversation(conversation.id)}
											className="flex w-full items-start gap-3 text-left"
										>
											<span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-(--sand)/20 text-sm font-semibold text-(--espresso)">
												{conversation.counterpart?.avatar_url ? (
													<Image
														src={conversation.counterpart.avatar_url}
														alt={counterpartName}
														width={40}
														height={40}
														className="h-full w-full object-cover"
													/>
												) : (
													initials(counterpartName)
												)}
											</span>
											<span className="min-w-0 flex-1">
												<span className="flex items-center justify-between gap-2">
													<span className="flex min-w-0 items-center gap-1.5">
														<span className="truncate text-sm font-semibold text-(--espresso)">{counterpartName}</span>
														{conversation.counterpart?.is_verified ? <VerifiedBadge /> : null}
													</span>
													<span className="shrink-0 text-[11px] text-(--muted)">
														{conversation.last_message_at ? formatDate(conversation.last_message_at, locale) : ""}
													</span>
												</span>
												<span className="mt-0.5 flex items-center justify-between gap-2">
													<span className="line-clamp-2 text-xs text-(--muted)">
														{conversation.last_message?.body_text || copy.emptyMessage}
													</span>
													{conversation.unread_hint ? (
														<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--accent) px-1.5 text-[10px] font-semibold text-(--surface)">
															{conversation.unread_count && conversation.unread_count > 0
																? conversation.unread_count > 99
																	? "99+"
																	: conversation.unread_count
																: "•"}
														</span>
													) : null}
												</span>
											</span>
										</button>
										<div className="mt-2 flex justify-end">
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => void archiveConversation(conversation.id, view !== "archived")}
												disabled={workingId === conversation.id}
												className="h-7 px-2 text-[11px]"
											>
												{workingId === conversation.id ? (
													<Loader2 size={12} className="animate-spin" />
												) : view === "archived" ? (
													<ArchiveRestore size={12} />
												) : (
													<Archive size={12} />
												)}
												<span className="ml-1">{view === "archived" ? copy.restore : copy.archive}</span>
											</Button>
										</div>
									</div>
								);
							})}

							{hasMore ? (
								<div className="pt-1">
									<Button
										type="button"
										variant="outline"
										className="w-full"
										disabled={loadingMore}
										onClick={() => void loadConversations({ reset: false, cursor: nextCursor })}
									>
										{loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
										<span className="ml-1">{copy.loadMore}</span>
									</Button>
								</div>
							) : null}
						</div>
					)}
				</div>
			</aside>

			<section
				className={cn(
					"min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border bg-(--surface-elevated) shadow-sm",
					selectedConversationId ? "flex" : "hidden lg:flex",
				)}
			>
				{selectedConversationId ? (
					<MessageThread
						conversationId={selectedConversationId}
						currentUserId={currentUserId}
						initialCounterpartName={
							selectedConversation?.counterpart?.display_name ||
							selectedConversation?.counterpart?.email ||
							(locale === "id" ? "Percakapan" : "Conversation")
						}
						locale={locale}
						onBack={handleBackToList}
					/>
				) : (
					<div className="hidden h-full w-full items-center justify-center lg:flex">
						<div className="max-w-sm rounded-2xl border border-dashed border-(--border) bg-(--surface) p-6 text-center">
							<MessageCircle size={22} className="mx-auto mb-3 text-(--muted)" />
							<p className="text-sm text-(--muted)">{copy.openThreadHint}</p>
						</div>
					</div>
				)}
			</section>
		</div>
	);
}
