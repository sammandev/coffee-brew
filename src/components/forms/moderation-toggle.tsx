"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";

interface ModerationToggleProps {
	targetType: "brew" | "thread" | "comment";
	targetId: string;
	hidden: boolean;
}

export function ModerationToggle({ targetType, targetId, hidden }: ModerationToggleProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function toggle() {
		setLoading(true);
		await fetch("/api/admin/moderation/hide", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				targetType,
				targetId,
				hide: !hidden,
				reason: hidden ? "Restore content" : "Hidden by moderator",
			}),
		});
		setLoading(false);
		router.refresh();
	}

	return (
		<Button onClick={toggle} size="sm" variant={hidden ? "secondary" : "outline"} disabled={loading}>
			{loading ? "..." : hidden ? (locale === "id" ? "Tampilkan" : "Unhide") : locale === "id" ? "Sembunyikan" : "Hide"}
		</Button>
	);
}
