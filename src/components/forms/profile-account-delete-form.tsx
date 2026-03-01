"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteModal } from "@/components/ui/delete-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/types";

interface ProfileAccountDeleteFormProps {
	accountRole: Role;
	email: string;
}

export function ProfileAccountDeleteForm({ accountRole, email }: ProfileAccountDeleteFormProps) {
	const { t } = useAppPreferences();
	const router = useRouter();
	const [confirmEmail, setConfirmEmail] = useState("");
	const [reason, setReason] = useState("");
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isSuperuser = accountRole === "superuser";
	const confirmationMatches = useMemo(
		() => confirmEmail.trim().toLowerCase() === email.toLowerCase(),
		[confirmEmail, email],
	);

	async function onDeleteAccount() {
		if (!confirmationMatches || isSuperuser) return;
		setIsDeleting(true);
		setError(null);

		const response = await fetch("/api/profile/account", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				confirmEmail,
				reason: reason.trim() || undefined,
			}),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? t("auth.deleteAccountFailed"));
			setIsDeleting(false);
			return;
		}

		await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
		setConfirmOpen(false);
		router.push("/login?reason=account_deleted");
		router.refresh();
	}

	return (
		<>
			<Card className="grid gap-3 border-(--danger)/30">
				<h3 className="font-heading text-xl text-(--espresso)">{t("auth.accountDangerZone")}</h3>
				<p className="text-sm text-(--muted)">{t("auth.deleteAccountWarning")}</p>

				<div className="grid gap-2">
					<Label htmlFor="confirm-account-email">{t("auth.deleteAccountConfirmEmail")}</Label>
					<Input
						id="confirm-account-email"
						value={confirmEmail}
						onChange={(event) => setConfirmEmail(event.currentTarget.value)}
						placeholder={email}
					/>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="delete-account-reason">{t("auth.deleteAccountReason")}</Label>
					<Textarea
						id="delete-account-reason"
						value={reason}
						onChange={(event) => setReason(event.currentTarget.value)}
						placeholder={t("auth.deleteAccountReasonPlaceholder")}
						className="min-h-24"
					/>
				</div>

				{isSuperuser ? <p className="text-sm text-(--danger)">{t("auth.deleteAccountBlockedSuperuser")}</p> : null}
				{!confirmationMatches && confirmEmail.length > 0 ? (
					<p className="text-sm text-(--danger)">{t("auth.deleteAccountMismatch")}</p>
				) : null}
				{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

				<div className="flex justify-end">
					<Button
						type="button"
						variant="destructive"
						disabled={!confirmationMatches || isSuperuser}
						onClick={() => setConfirmOpen(true)}
					>
						{t("auth.deleteAccountAction")}
					</Button>
				</div>
			</Card>

			<DeleteModal
				open={confirmOpen}
				onClose={() => {
					if (!isDeleting) setConfirmOpen(false);
				}}
				onConfirm={() => void onDeleteAccount()}
				isSubmitting={isDeleting}
				title={t("auth.accountDangerZone")}
				description={t("auth.deleteAccountConfirmModal")}
				confirmLabel={t("auth.deleteAccountAction")}
			/>
		</>
	);
}
