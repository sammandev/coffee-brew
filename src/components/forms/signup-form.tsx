"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignupForm() {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function signUpWithEmail(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setMessage(null);

		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "");
		const password = String(formData.get("password") ?? "");
		const displayName = String(formData.get("displayName") ?? "");
		const newsletterOptIn = formData.get("newsletter") === "on";

		const supabase = createSupabaseBrowserClient();
		const { error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					display_name: displayName,
					newsletter_opt_in: newsletterOptIn,
				},
				emailRedirectTo: `${window.location.origin}/dashboard`,
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
					email,
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

		const supabase = createSupabaseBrowserClient();
		const { error: oauthError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/dashboard`,
			},
		});

		if (oauthError) {
			setError(oauthError.message);
			return;
		}
	}

	return (
		<div className="grid gap-5">
			<form onSubmit={signUpWithEmail} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-6">
				<h2 className="font-heading text-2xl text-(--espresso)">{t("auth.createAccount")}</h2>
				<div>
					<Label htmlFor="displayName">{locale === "id" ? "Nama Tampilan" : "Display Name"}</Label>
					<Input id="displayName" name="displayName" required />
				</div>
				<div>
					<Label htmlFor="email">Email</Label>
					<Input id="email" name="email" type="email" required />
				</div>
				<div>
					<Label htmlFor="password">Password</Label>
					<Input id="password" name="password" type="password" required minLength={8} />
				</div>

				<label className="flex items-center gap-2 text-sm text-(--muted)">
					<input type="checkbox" name="newsletter" className="size-4 rounded border" />
					{locale === "id" ? "Berlangganan newsletter kopi." : "Subscribe to coffee newsletter updates."}
				</label>

				<Button type="submit">{t("auth.createAccount")}</Button>

				<div className="relative py-1">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase tracking-wide text-(--muted)">
						<span className="bg-(--surface-elevated) px-2">{t("auth.orContinueWith")}</span>
					</div>
				</div>

				<Button type="button" variant="outline" onClick={signInWithGoogle} className="gap-2">
					<GoogleIcon />
					{t("auth.continueGoogle")}
				</Button>
			</form>

			{message && <p className="text-sm text-(--accent)">{message}</p>}
			{error && <p className="text-sm text-(--danger)">{error}</p>}
		</div>
	);
}
