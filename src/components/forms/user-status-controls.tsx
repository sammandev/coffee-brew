"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";

interface UserStatusControlsProps {
	userId: string;
	status: "active" | "blocked" | "disabled";
}

export function UserStatusControls({ userId, status }: UserStatusControlsProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [loading, setLoading] = useState<string | null>(null);

	async function trigger(action: "block" | "disable" | "delete") {
		setLoading(action);

		const endpoint = action === "delete" ? `/api/superuser/users/${userId}` : `/api/superuser/users/${userId}/${action}`;

		const response = await fetch(endpoint, {
			method: action === "delete" ? "DELETE" : "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ reason: `Action from UI: ${action}` }),
		});

		setLoading(null);

		if (response.ok) {
			router.refresh();
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="rounded-full bg-(--sand)/30 px-3 py-1 text-xs font-semibold text-(--espresso)">{status}</span>
			<Button variant="outline" size="sm" onClick={() => trigger("block")} disabled={loading !== null}>
				{loading === "block" ? "..." : locale === "id" ? "Blokir" : "Block"}
			</Button>
			<Button variant="outline" size="sm" onClick={() => trigger("disable")} disabled={loading !== null}>
				{loading === "disable" ? "..." : locale === "id" ? "Nonaktifkan" : "Disable"}
			</Button>
			<Button variant="destructive" size="sm" onClick={() => trigger("delete")} disabled={loading !== null}>
				{loading === "delete" ? "..." : locale === "id" ? "Hapus" : "Delete"}
			</Button>
		</div>
	);
}
