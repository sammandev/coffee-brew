"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface ThreadTypingIndicatorProps {
	currentUserId?: string | null;
	locale: "en" | "id";
	threadId: string;
}

interface TypingUserState {
	userId: string;
	updatedAt: number;
}

const TTL_MS = 5000;

export function ThreadTypingIndicator({ currentUserId, locale, threadId }: ThreadTypingIndicatorProps) {
	const [typingUsers, setTypingUsers] = useState<Record<string, TypingUserState>>({});

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase.channel(`thread-typing-${threadId}`);
		channel.on("broadcast", { event: "typing" }, ({ payload }) => {
			const userId = typeof payload?.userId === "string" ? payload.userId : "";
			if (!userId || userId === currentUserId) return;
			setTypingUsers((previous) => ({
				...previous,
				[userId]: {
					userId,
					updatedAt: Date.now(),
				},
			}));
		});
		channel.subscribe();
		return () => {
			void supabase.removeChannel(channel);
		};
	}, [threadId, currentUserId]);

	useEffect(() => {
		const interval = setInterval(() => {
			setTypingUsers((previous) =>
				Object.fromEntries(Object.entries(previous).filter(([, value]) => Date.now() - value.updatedAt <= TTL_MS)),
			);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const typingCount = useMemo(
		() => Object.values(typingUsers).filter((state) => state.userId !== currentUserId).length,
		[typingUsers, currentUserId],
	);

	if (typingCount <= 0) return null;

	return (
		<div className="inline-flex items-center gap-2 rounded-full bg-(--accent)/10 px-3 py-1 text-xs font-medium text-(--accent)">
			<span className="flex gap-0.5">
				<span className="h-1 w-1 animate-bounce rounded-full bg-(--accent)" style={{ animationDelay: "0ms" }} />
				<span className="h-1 w-1 animate-bounce rounded-full bg-(--accent)" style={{ animationDelay: "150ms" }} />
				<span className="h-1 w-1 animate-bounce rounded-full bg-(--accent)" style={{ animationDelay: "300ms" }} />
			</span>
			{locale === "id"
				? `${typingCount} pengguna sedang mengetik`
				: `${typingCount} user${typingCount > 1 ? "s" : ""} typing`}
		</div>
	);
}
