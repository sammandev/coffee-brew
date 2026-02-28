"use client";

import { Archive, ArchiveRestore, Loader2, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

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
}

interface ConversationsResponse {
	conversations?: ConversationItem[];
	unread_count?: number;
}

interface MessagesInboxProps {
	locale: "en" | "id";
}

export function MessagesInbox({ locale }: MessagesInboxProps) {
	const [view, setView] = useState<InboxView>("active");
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [workingId, setWorkingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [conversations, setConversations] = useState<ConversationItem[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);

	const copy = useMemo(
		() => ({
			title: locale === "id" ? "Pesan" : "Messages",
			subtitle: locale === "id" ? "Kelola percakapan pribadi Anda di sini." : "Manage your private conversations here.",
			active: locale === "id" ? "Aktif" : "Active",
			archived: locale === "id" ? "Arsip" : "Archived",
			searchPlaceholder: locale === "id" ? "Cari percakapan..." : "Search conversations...",
			noActive: locale === "id" ? "Belum ada percakapan aktif." : "No active conversations yet.",
			noArchived: locale === "id" ? "Belum ada percakapan arsip." : "No archived conversations yet.",
			open: locale === "id" ? "Buka" : "Open",
			archive: locale === "id" ? "Arsipkan" : "Archive",
			restore: locale === "id" ? "Pulihkan" : "Restore",
			unread: locale === "id" ? "Belum dibaca" : "Unread",
		}),
		[locale],
	);

	const loadConversations = useCallback(
		async (nextView: InboxView, nextQuery: string) => {
			setLoading(true);
			setError(null);
			const response = await fetch(
				`/api/messages/conversations?view=${nextView}&q=${encodeURIComponent(nextQuery)}&limit=30`,
				{ method: "GET" },
			).catch(() => null);
			if (!response?.ok) {
				setError(locale === "id" ? "Gagal memuat percakapan." : "Could not load conversations.");
				setConversations([]);
				setLoading(false);
				return;
			}
			const body = (await response.json().catch(() => ({}))) as ConversationsResponse;
			setConversations(Array.isArray(body.conversations) ? body.conversations : []);
			setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
			setLoading(false);
		},
		[locale],
	);

	useEffect(() => {
		const handle = setTimeout(() => {
			void loadConversations(view, query);
		}, 250);
		return () => clearTimeout(handle);
	}, [query, view, loadConversations]);

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
		await loadConversations(view, query);
		setWorkingId(null);
	}

	return (
		<div className="space-y-4">
			<header className="space-y-2">
				<h1 className="font-heading text-4xl text-(--espresso)">{copy.title}</h1>
				<p className="text-sm text-(--muted)">
					{copy.subtitle}
					{unreadCount > 0 ? ` · ${unreadCount} ${copy.unread}` : ""}
				</p>
			</header>

			<div className="flex flex-wrap items-center gap-2">
				<Button type="button" variant={view === "active" ? "primary" : "outline"} onClick={() => setView("active")}>
					{copy.active}
				</Button>
				<Button type="button" variant={view === "archived" ? "primary" : "outline"} onClick={() => setView("archived")}>
					{copy.archived}
				</Button>
				<div className="relative ml-auto w-full max-w-sm">
					<Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--muted)" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.currentTarget.value)}
						placeholder={copy.searchPlaceholder}
						className="pl-8"
					/>
				</div>
			</div>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

			{loading ? (
				<Card className="flex items-center gap-2 text-sm text-(--muted)">
					<Loader2 size={14} className="animate-spin" />
					{locale === "id" ? "Memuat percakapan..." : "Loading conversations..."}
				</Card>
			) : conversations.length === 0 ? (
				<Card className="text-sm text-(--muted)">{view === "active" ? copy.noActive : copy.noArchived}</Card>
			) : (
				<div className="grid gap-3">
					{conversations.map((conversation) => (
						<Card key={conversation.id} className="flex flex-wrap items-center justify-between gap-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold text-(--espresso)">
									{conversation.counterpart?.display_name || conversation.counterpart?.email || "Unknown User"}
								</p>
								<p className="truncate text-xs text-(--muted)">
									{conversation.last_message?.body_text || (locale === "id" ? "Belum ada pesan." : "No messages yet.")}
								</p>
								<p className="mt-1 text-[11px] text-(--muted)">
									{conversation.last_message_at ? formatDate(conversation.last_message_at, locale) : ""}
								</p>
							</div>

							<div className="flex items-center gap-2">
								{conversation.unread_hint && view === "active" ? (
									<span className="rounded-full bg-(--accent) px-2 py-0.5 text-[11px] font-semibold text-(--surface)">
										{copy.unread}
									</span>
								) : null}

								<Link
									href={`/messages/${conversation.id}`}
									className="inline-flex h-9 items-center gap-1 rounded-lg border border-(--border) px-3 text-xs font-semibold transition hover:bg-(--sand)/20"
								>
									<MessageCircle size={14} />
									{copy.open}
								</Link>

								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => void archiveConversation(conversation.id, view !== "archived")}
									disabled={workingId === conversation.id}
								>
									{workingId === conversation.id ? (
										<Loader2 size={14} className="animate-spin" />
									) : view === "archived" ? (
										<ArchiveRestore size={14} />
									) : (
										<Archive size={14} />
									)}
									<span className="ml-1">{view === "archived" ? copy.restore : copy.archive}</span>
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
