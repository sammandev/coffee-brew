"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/types";

interface UserRoleControlsProps {
	currentRole: Role;
	userId: string;
}

export function UserRoleControls({ currentRole, userId }: UserRoleControlsProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (currentRole === "superuser") {
		return null;
	}

	const nextRole: "admin" | "user" = currentRole === "user" ? "admin" : "user";

	async function updateRole() {
		setIsSubmitting(true);
		setError(null);

		const response = await fetch(`/api/superuser/users/${userId}/role`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ role: nextRole }),
		}).catch(() => null);

		setIsSubmitting(false);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { details?: string; error?: string }) : null;
			setError(body?.details ?? body?.error ?? (locale === "id" ? "Gagal mengubah peran." : "Could not update role."));
			return;
		}

		router.refresh();
	}

	return (
		<div className="space-y-1">
			<Button type="button" size="sm" variant="outline" onClick={() => void updateRole()} disabled={isSubmitting}>
				{isSubmitting
					? "..."
					: nextRole === "admin"
						? locale === "id"
							? "Jadikan Admin"
							: "Make Admin"
						: locale === "id"
							? "Jadikan User"
							: "Set as User"}
			</Button>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
