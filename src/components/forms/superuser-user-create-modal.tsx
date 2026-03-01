"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";

export function SuperuserUserCreateModal() {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [role, setRole] = useState<"admin" | "user">("user");
	const [emailConfirmed, setEmailConfirmed] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function resetForm() {
		setEmail("");
		setPassword("");
		setDisplayName("");
		setRole("user");
		setEmailConfirmed(true);
		setError(null);
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const response = await fetch("/api/superuser/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email,
				password,
				displayName: displayName.trim().length > 0 ? displayName.trim() : undefined,
				role,
				emailConfirmed,
			}),
		}).catch(() => null);

		setIsSubmitting(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { details?: string; error?: string }) : null;
			setError(body?.details ?? body?.error ?? (locale === "id" ? "Gagal menambah pengguna." : "Could not create user."));
			return;
		}

		resetForm();
		setOpen(false);
		router.refresh();
	}

	return (
		<>
			<Button type="button" size="sm" onClick={() => setOpen(true)}>
				{locale === "id" ? "Tambah Pengguna" : "Add User"}
			</Button>

			<FormModal
				open={open}
				onClose={() => {
					if (isSubmitting) return;
					setOpen(false);
					resetForm();
				}}
				closeDisabled={isSubmitting}
				title={locale === "id" ? "Tambah Pengguna" : "Add User"}
				description={
					locale === "id"
						? "Buat akun baru sebagai pengguna biasa atau admin."
						: "Create a new account as regular user or admin."
				}
				maxWidthClassName="max-w-xl"
				footer={
					<div className="flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								setOpen(false);
								resetForm();
							}}
							disabled={isSubmitting}
						>
							{locale === "id" ? "Batal" : "Cancel"}
						</Button>
						<Button type="submit" form="create-user-form" disabled={isSubmitting}>
							{isSubmitting ? (locale === "id" ? "Menyimpan..." : "Saving...") : locale === "id" ? "Simpan" : "Save"}
						</Button>
					</div>
				}
			>
				<form id="create-user-form" className="grid gap-4" onSubmit={onSubmit}>
					<div className="grid gap-2">
						<Label htmlFor="create-user-email">Email</Label>
						<Input
							id="create-user-email"
							type="email"
							required
							value={email}
							onChange={(event) => setEmail(event.currentTarget.value)}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="create-user-password">{locale === "id" ? "Password" : "Password"}</Label>
						<PasswordInput
							id="create-user-password"
							minLength={8}
							required
							value={password}
							onChange={(event) => setPassword(event.currentTarget.value)}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="create-user-display-name">{locale === "id" ? "Nama Tampilan" : "Display Name"}</Label>
						<Input
							id="create-user-display-name"
							value={displayName}
							onChange={(event) => setDisplayName(event.currentTarget.value)}
							placeholder={locale === "id" ? "Opsional" : "Optional"}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="create-user-role">{locale === "id" ? "Peran" : "Role"}</Label>
						<Select
							id="create-user-role"
							value={role}
							onChange={(event) => setRole(event.currentTarget.value === "admin" ? "admin" : "user")}
						>
							<option value="user">{locale === "id" ? "User" : "User"}</option>
							<option value="admin">{locale === "id" ? "Admin" : "Admin"}</option>
						</Select>
					</div>

					<div className="inline-flex items-center gap-2">
						<Checkbox
							id="create-user-email-confirmed"
							checked={emailConfirmed}
							onChange={(event) => setEmailConfirmed(event.currentTarget.checked)}
						/>
						<Label htmlFor="create-user-email-confirmed" className="font-medium">
							{locale === "id" ? "Email sudah terverifikasi" : "Email is confirmed"}
						</Label>
					</div>

					{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
				</form>
			</FormModal>
		</>
	);
}
