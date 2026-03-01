"use client";

import { Archive, ArchiveRestore, Loader2, MessageCircle, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageThread } from "@/components/messages/message-thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
		async ({ reset, cursor }: { cursor?: string | null; reset: boolean }) => {
			if (reset) {
				setLoading(true);
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

	useEffect(() => {
		const handle = setTimeout(() => {
			void loadConversations({ reset: true });
		}, 220);
		return () => clearTimeout(handle);
	}, [loadConversations]);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase
			.channel(`dm-workspace:${currentUserId}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, () => {
				void loadConversations({ reset: true });
			})
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "dm_participants", filter: `user_id=eq.${currentUserId}` },
				() => {
					void loadConversations({ reset: true });
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [currentUserId, loadConversations]);

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
		<div className="flex h-full w-full min-h-[calc(100dvh-6.2rem)] gap-3">
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
								syncUrl({ q: nextValue });
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
													// biome-ignore lint/performance/noImgElement: avatar can come from Supabase public URL
													<img
														src={conversation.counterpart.avatar_url}
														alt={counterpartName}
														className="h-full w-full object-cover"
													/>
												) : (
													initials(counterpartName)
												)}
											</span>
											<span className="min-w-0 flex-1">
												<span className="flex items-center justify-between gap-2">
													<span className="truncate text-sm font-semibold text-(--espresso)">
														{counterpartName}
														{conversation.counterpart?.is_verified ? " ✓" : ""}
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
					"min-w-0 flex-1 overflow-hidden rounded-2xl border bg-(--surface-elevated) shadow-sm",
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
