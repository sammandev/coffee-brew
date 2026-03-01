"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

	useEffect(() => {
		let active = true;
		async function loadUnreadCount() {
			const response = await fetch("/api/messages/unread-count", { method: "GET" }).catch(() => null);
			if (!active || !response?.ok) return;
			const body = (await response.json().catch(() => ({}))) as UnreadCountResponse;
			setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
		}
		void loadUnreadCount();
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase
			.channel(`dm-unread:${userId}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, () => {
				void fetch("/api/messages/unread-count", { method: "GET" })
					.then(async (response) => {
						if (!response.ok) return null;
						return (await response.json().catch(() => ({}))) as UnreadCountResponse;
					})
					.then((body) => {
						if (!body) return;
						setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
					});
			})
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "dm_participants", filter: `user_id=eq.${userId}` },
				() => {
					void fetch("/api/messages/unread-count", { method: "GET" })
						.then(async (response) => {
							if (!response.ok) return null;
							return (await response.json().catch(() => ({}))) as UnreadCountResponse;
						})
						.then((body) => {
							if (!body) return;
							setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
						});
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [userId]);

	useEffect(() => {
		if (!pathname.startsWith("/messages")) return;
		void fetch("/api/messages/unread-count", { method: "GET" })
			.then(async (response) => {
				if (!response.ok) return null;
				return (await response.json().catch(() => ({}))) as UnreadCountResponse;
			})
			.then((body) => {
				if (!body) return;
				setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
			});
	}, [pathname]);

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
