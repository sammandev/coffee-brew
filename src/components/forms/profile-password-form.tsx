"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const PASSWORD_MIN_LENGTH = 8;

export function ProfilePasswordForm() {
	const { locale } = useAppPreferences();
	const [nextPassword, setNextPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSuccess(null);

		if (nextPassword.length < PASSWORD_MIN_LENGTH) {
			setError(
				locale === "id"
					? `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`
					: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
			);
			return;
		}

		if (nextPassword !== confirmPassword) {
			setError(locale === "id" ? "Konfirmasi kata sandi tidak cocok." : "Password confirmation does not match.");
			return;
		}

		setIsSubmitting(true);
		const supabase = createSupabaseBrowserClient();
		const { error: authError } = await supabase.auth.updateUser({
			password: nextPassword,
		});

		if (authError) {
			setError(authError.message);
			setIsSubmitting(false);
			return;
		}

		setNextPassword("");
		setConfirmPassword("");
		setSuccess(locale === "id" ? "Kata sandi berhasil diperbarui." : "Password updated successfully.");
		setIsSubmitting(false);
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
			<h3 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Ubah Kata Sandi" : "Change Password"}</h3>

			<div>
				<Label htmlFor="next_password">{locale === "id" ? "Kata sandi baru" : "New password"}</Label>
				<PasswordInput
					id="next_password"
					value={nextPassword}
					onChange={(event) => setNextPassword(event.currentTarget.value)}
					autoComplete="new-password"
					minLength={PASSWORD_MIN_LENGTH}
					required
					showLabel={locale === "id" ? "Tampilkan kata sandi" : "Show password"}
					hideLabel={locale === "id" ? "Sembunyikan kata sandi" : "Hide password"}
				/>
			</div>
			<div>
				<Label htmlFor="confirm_password">{locale === "id" ? "Konfirmasi kata sandi" : "Confirm password"}</Label>
				<PasswordInput
					id="confirm_password"
					value={confirmPassword}
					onChange={(event) => setConfirmPassword(event.currentTarget.value)}
					autoComplete="new-password"
					minLength={PASSWORD_MIN_LENGTH}
					required
					showLabel={locale === "id" ? "Tampilkan kata sandi" : "Show password"}
					hideLabel={locale === "id" ? "Sembunyikan kata sandi" : "Hide password"}
				/>
			</div>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
			{success ? <p className="text-sm text-(--accent)">{success}</p> : null}

			<div className="flex justify-end">
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? locale === "id"
							? "Memperbarui..."
							: "Updating..."
						: locale === "id"
							? "Perbarui Kata Sandi"
							: "Update Password"}
				</Button>
			</div>
		</form>
	);
}
