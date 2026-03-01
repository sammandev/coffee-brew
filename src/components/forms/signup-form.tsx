"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { getPreparedAuthCallbackUrl } from "@/lib/auth-callback-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface SignupFormProps {
	enableGoogleLogin?: boolean;
}

export function SignupForm({ enableGoogleLogin = true }: SignupFormProps) {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [validationIssues, setValidationIssues] = useState<string[]>([]);

	async function signUpWithEmail(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setMessage(null);
		setValidationIssues([]);

		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "");
		const password = String(formData.get("password") ?? "");
		const displayName = String(formData.get("displayName") ?? "");
		const newsletterOptIn = formData.get("newsletter") === "on";
		const issues: string[] = [];
		const normalizedEmail = email.trim();
		if (displayName.trim().length === 0) {
			issues.push(locale === "id" ? "Nama tampilan wajib diisi." : "Display name is required.");
		}
		if (normalizedEmail.length === 0) {
			issues.push(locale === "id" ? "Email wajib diisi." : "Email is required.");
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			issues.push(locale === "id" ? "Format email tidak valid." : "Email format is invalid.");
		}
		if (password.length < 8) {
			issues.push(locale === "id" ? "Kata sandi minimal 8 karakter." : "Password must be at least 8 characters.");
		}
		if (issues.length > 0) {
			setValidationIssues(issues);
			return;
		}
		let callbackUrl: string;

		try {
			callbackUrl = await getPreparedAuthCallbackUrl("/session/resolve");
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Could not prepare secure authentication callback.");
			return;
		}

		const supabase = createSupabaseBrowserClient();
		const { error: signUpError } = await supabase.auth.signUp({
			email: normalizedEmail,
			password,
			options: {
				data: {
					display_name: displayName,
					newsletter_opt_in: newsletterOptIn,
				},
				emailRedirectTo: callbackUrl,
			},
		});

		if (signUpError) {
			setError(signUpError.message);
			return;
		}

		if (newsletterOptIn) {
			await fetch("/api/newsletter/subscribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: normalizedEmail,
					consent: true,
					source: "signup",
				}),
			});
		}

		setMessage(t("auth.accountCreated"));
		router.refresh();
	}

	async function signInWithGoogle() {
		setError(null);
		setMessage(null);
		setValidationIssues([]);

		try {
			const supabase = createSupabaseBrowserClient();
			const callbackUrl = await getPreparedAuthCallbackUrl("/session/resolve");
			const { error: oauthError } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: callbackUrl,
				},
			});

			if (oauthError) {
				setError(oauthError.message);
				return;
			}
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Could not prepare secure authentication callback.");
		}
	}

	return (
		<div className="grid gap-5">
			<form onSubmit={signUpWithEmail} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-6">
				<h2 className="font-heading text-2xl text-(--espresso)">{t("auth.createAccount")}</h2>
				<div>
					<Label htmlFor="displayName">{locale === "id" ? "Nama Tampilan" : "Display Name"}</Label>
					<Input id="displayName" name="displayName" autoComplete="name" required />
				</div>
				<div>
					<Label htmlFor="email">Email</Label>
					<Input id="email" name="email" type="email" autoComplete="email" required />
				</div>
				<div>
					<Label htmlFor="password">Password</Label>
					<PasswordInput
						id="password"
						name="password"
						autoComplete="new-password"
						required
						minLength={8}
						showLabel={t("auth.showPassword")}
						hideLabel={t("auth.hidePassword")}
					/>
				</div>

				<div className="flex items-center gap-2 text-sm text-(--muted)">
					<Checkbox name="newsletter" />
					{locale === "id" ? "Berlangganan newsletter kopi." : "Subscribe to coffee newsletter updates."}
				</div>

				{validationIssues.length > 0 ? (
					<Card className="space-y-2 border-(--danger)/40 bg-(--danger)/5 p-4">
						<p className="text-sm font-semibold text-(--danger)">
							{locale === "id" ? "Periksa kembali input Anda" : "Please review your input"}
						</p>
						<ul className="list-disc space-y-1 pl-5 text-sm text-(--danger)">
							{validationIssues.map((issue) => (
								<li key={issue}>{issue}</li>
							))}
						</ul>
					</Card>
				) : null}

				<Button type="submit">{t("auth.createAccount")}</Button>

				<div className="relative py-1">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase tracking-wide text-(--muted)">
						<span className="bg-(--surface-elevated) px-2">{t("auth.orContinueWith")}</span>
					</div>
				</div>

				{enableGoogleLogin && (
					<Button type="button" variant="outline" onClick={signInWithGoogle} className="gap-2">
						<GoogleIcon />
						{t("auth.continueGoogle")}
					</Button>
				)}
			</form>

			{message ? (
				<Card className="border-(--accent)/40 bg-(--accent)/10 p-4 text-sm text-(--accent)">{message}</Card>
			) : null}
			{error ? <Card className="border-(--danger)/40 bg-(--danger)/5 p-4 text-sm text-(--danger)">{error}</Card> : null}
		</div>
	);
}
