"use client";

import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface NavbarMessagesProps {
	mobile?: boolean;
	userId: string;
}

interface UnreadCountResponse {
	unread_count?: number;
}

export function NavbarMessages({ userId, mobile = false }: NavbarMessagesProps) {
	const pathname = usePathname();
	const [unreadCount, setUnreadCount] = useState(0);
	const unreadChannelRef = useRef<RealtimeChannel | null>(null);
	const unreadSubscriptionGenerationRef = useRef(0);

	const loadUnreadCount = useCallback(async () => {
		const response = await fetch("/api/messages/unread-count", { method: "GET" }).catch(() => null);
		if (!response?.ok) return;
		const body = (await response.json().catch(() => ({}))) as UnreadCountResponse;
		setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
	}, []);

	useEffect(() => {
		let active = true;
		async function loadInitialUnreadCount() {
			const response = await fetch("/api/messages/unread-count", { method: "GET" }).catch(() => null);
			if (!active || !response?.ok) return;
			const body = (await response.json().catch(() => ({}))) as UnreadCountResponse;
			setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
		}
		void loadInitialUnreadCount();
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		unreadSubscriptionGenerationRef.current += 1;
		const generation = unreadSubscriptionGenerationRef.current;
		const supabase = createSupabaseBrowserClient();
		if (unreadChannelRef.current) {
			void supabase.removeChannel(unreadChannelRef.current);
			unreadChannelRef.current = null;
		}
		const channel = supabase
			.channel(`dm-unread:${userId}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, (payload) => {
				if (generation !== unreadSubscriptionGenerationRef.current) return;
				const messagePayload = payload as RealtimePostgresChangesPayload<Record<string, unknown>>;
				if (messagePayload.eventType !== "INSERT") {
					void loadUnreadCount();
					return;
				}
				const senderId = typeof messagePayload.new?.sender_id === "string" ? messagePayload.new.sender_id : null;
				if (!senderId || senderId === userId || pathname.startsWith("/messages")) {
					return;
				}
				setUnreadCount((current) => current + 1);
			})
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "dm_participants", filter: `user_id=eq.${userId}` },
				() => {
					if (generation !== unreadSubscriptionGenerationRef.current) return;
					void loadUnreadCount();
				},
			)
			.subscribe();
		unreadChannelRef.current = channel;

		return () => {
			unreadSubscriptionGenerationRef.current += 1;
			unreadChannelRef.current = null;
			void supabase.removeChannel(channel);
		};
	}, [loadUnreadCount, pathname, userId]);

	useEffect(() => {
		if (!pathname.startsWith("/messages")) return;
		void loadUnreadCount();
	}, [loadUnreadCount, pathname]);

	return (
		<Link
			href="/messages"
			className={cn(
				"relative inline-flex h-10 items-center justify-center rounded-lg border border-(--border) bg-(--surface) px-3 text-sm font-semibold transition hover:bg-(--sand)/15",
				mobile && "w-full justify-start gap-2",
			)}
			aria-label="Direct messages"
		>
			<MessageCircle size={16} />
			{mobile ? <span>{unreadCount > 0 ? `Messages (${unreadCount})` : "Messages"}</span> : null}
			{unreadCount > 0 ? (
				<span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-(--danger) px-1 text-[10px] font-semibold text-white">
					{unreadCount > 99 ? "99+" : unreadCount}
				</span>
			) : null}
		</Link>
	);
}
