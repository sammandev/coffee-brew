"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StartMessageButtonProps {
	disabled?: boolean;
	disabledReason?: string;
	recipientId: string;
}

export function StartMessageButton({ disabled = false, disabledReason, recipientId }: StartMessageButtonProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function startConversation() {
		if (disabled || loading) return;
		setLoading(true);
		setError(null);
		const response = await fetch("/api/messages/conversations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ recipientId }),
		}).catch(() => null);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { details?: string; error?: string }) : null;
			setError(body?.details || body?.error || "Could not start conversation.");
			setLoading(false);
			return;
		}
		const body = (await response.json().catch(() => ({}))) as { conversation_id?: string };
		setLoading(false);
		if (!body.conversation_id) {
			setError("Conversation could not be created.");
			return;
		}
		router.push(`/messages/${body.conversation_id}`);
	}

	return (
		<div className="grid gap-1">
			<Button type="button" onClick={() => void startConversation()} disabled={disabled || loading} title={disabledReason}>
				{loading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
				<span className="ml-1">Message</span>
			</Button>
			{disabledReason ? <p className="text-[11px] text-(--muted)">{disabledReason}</p> : null}
			{error ? <p className="text-[11px] text-(--danger)">{error}</p> : null}
		</div>
	);
}
