"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/ui/delete-modal";
import { WarningModal } from "@/components/ui/warning-modal";

interface UserStatusControlsProps {
	isVerified?: boolean;
	userId: string;
	status: "active" | "blocked" | "disabled";
}

export function UserStatusControls({ userId, status, isVerified = false }: UserStatusControlsProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [loading, setLoading] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<"block" | "delete" | "disable" | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function trigger(action: "block" | "disable" | "delete") {
		setLoading(action);
		setError(null);

		const endpoint = action === "delete" ? `/api/superuser/users/${userId}` : `/api/superuser/users/${userId}/${action}`;

		const response = await fetch(endpoint, {
			method: action === "delete" ? "DELETE" : "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ reason: `Action from UI: ${action}` }),
		}).catch(() => null);

		setLoading(null);

		if (response?.ok) {
			setPendingAction(null);
			router.refresh();
			return;
		}

		const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
		setError(body?.error ?? (locale === "id" ? "Aksi pengguna gagal." : "User action failed."));
	}

	async function toggleVerified() {
		setLoading("verify");
		setError(null);
		const response = await fetch(`/api/superuser/users/${userId}/verify`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ verified: !isVerified }),
		}).catch(() => null);
		setLoading(null);
		if (response?.ok) {
			router.refresh();
			return;
		}
		const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
		setError(body?.error ?? (locale === "id" ? "Aksi verifikasi gagal." : "Verification update failed."));
	}

	const isWarningAction = pendingAction === "block" || pendingAction === "disable";
	const warningTitle =
		pendingAction === "block"
			? locale === "id"
				? "Blokir Pengguna"
				: "Block User"
			: locale === "id"
				? "Nonaktifkan Pengguna"
				: "Disable User";
	const warningDescription =
		pendingAction === "block"
			? locale === "id"
				? "Pengguna tidak dapat mengakses akun hingga status diubah kembali."
				: "This user will not be able to access their account until status is changed."
			: locale === "id"
				? "Akun pengguna akan dinonaktifkan dan tidak dapat digunakan."
				: "This user account will be disabled and cannot be used.";

	return (
		<>
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className="rounded-full bg-(--sand)/30 px-3 py-1 text-xs font-semibold text-(--espresso)">{status}</span>
					<Button variant="outline" size="sm" onClick={() => setPendingAction("block")} disabled={loading !== null}>
						{loading === "block" ? "..." : locale === "id" ? "Blokir" : "Block"}
					</Button>
					<Button variant="outline" size="sm" onClick={() => setPendingAction("disable")} disabled={loading !== null}>
						{loading === "disable" ? "..." : locale === "id" ? "Nonaktifkan" : "Disable"}
					</Button>
					<Button variant="outline" size="sm" onClick={() => void toggleVerified()} disabled={loading !== null}>
						{loading === "verify"
							? "..."
							: isVerified
								? locale === "id"
									? "Cabut Verifikasi"
									: "Unverify"
								: locale === "id"
									? "Verifikasi"
									: "Verify"}
					</Button>
					<Button variant="destructive" size="sm" onClick={() => setPendingAction("delete")} disabled={loading !== null}>
						{loading === "delete" ? "..." : locale === "id" ? "Hapus" : "Delete"}
					</Button>
				</div>
				{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
			</div>

			<WarningModal
				open={isWarningAction}
				onClose={() => setPendingAction(null)}
				onConfirm={() => (pendingAction ? trigger(pendingAction) : Promise.resolve())}
				isSubmitting={loading !== null}
				title={warningTitle}
				description={warningDescription}
				confirmLabel={
					pendingAction === "block" ? (locale === "id" ? "Blokir" : "Block") : locale === "id" ? "Nonaktifkan" : "Disable"
				}
			/>

			<DeleteModal
				open={pendingAction === "delete"}
				onClose={() => setPendingAction(null)}
				onConfirm={() => trigger("delete")}
				isSubmitting={loading === "delete"}
				title={locale === "id" ? "Hapus Pengguna" : "Delete User"}
				description={locale === "id" ? "Pengguna akan dihapus permanen." : "This user will be permanently deleted."}
				confirmLabel={locale === "id" ? "Hapus" : "Delete"}
			/>
		</>
	);
}
