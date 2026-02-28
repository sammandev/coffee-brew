"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginMode = "password" | "magic";

interface LoginFormProps {
	enableGoogleLogin?: boolean;
	enableMagicLinkLogin?: boolean;
}

export function LoginForm({ enableGoogleLogin = true, enableMagicLinkLogin = true }: LoginFormProps) {
	const { t } = useAppPreferences();
	const router = useRouter();
	const [mode, setMode] = useState<LoginMode>("password");
	const [isLoading, setIsLoading] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	function switchMode(nextMode: LoginMode) {
		setMode(nextMode);
		setError(null);
		setSuccess(null);
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSuccess(null);
		setIsLoading(true);

		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "");
		const supabase = createSupabaseBrowserClient();

		if (mode === "password") {
			const password = String(formData.get("password") ?? "");
			const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

			if (authError) {
				setError(authError.message);
				setIsLoading(false);
				return;
			}

			router.push("/session/resolve");
			router.refresh();
			return;
		}

		if (!enableMagicLinkLogin) {
			setError("Magic link login is disabled.");
			setIsLoading(false);
			return;
		}

		const { error: authError } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${window.location.origin}/session/resolve`,
			},
		});

		if (authError) {
			setError(authError.message);
			setIsLoading(false);
			return;
		}

		setSuccess(t("auth.magicLinkSent"));
		setIsLoading(false);
	}

	async function loginWithGoogle() {
		setError(null);
		setSuccess(null);

		const supabase = createSupabaseBrowserClient();
		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/session/resolve`,
			},
		});

		if (authError) {
			setError(authError.message);
		}
	}

	return (
		<div className="grid gap-5">
			<form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-6">
				<h2 className="font-heading text-2xl text-(--espresso)">{t("auth.signIn")}</h2>

				<div>
					<Label htmlFor="login-email">Email</Label>
					<Input id="login-email" name="email" type="email" required />
				</div>
				{mode === "password" && (
					<div>
						<Label htmlFor="password">Password</Label>
						<Input id="password" name="password" type="password" required minLength={8} />
					</div>
				)}
				<Button type="submit" disabled={isLoading}>
					{mode === "password" ? (isLoading ? t("auth.signingIn") : t("auth.signInWithEmail")) : t("auth.sendMagicLink")}
				</Button>

				<div className="relative py-1">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase tracking-wide text-(--muted)">
						<span className="bg-(--surface-elevated) px-2">{t("auth.orContinueWith")}</span>
					</div>
				</div>

				{enableMagicLinkLogin && (
					<Button
						type="button"
						onClick={() => switchMode(mode === "password" ? "magic" : "password")}
						variant="secondary"
						disabled={isLoading}
					>
						{mode === "password" ? t("auth.continueMagicLink") : t("auth.continuePassword")}
					</Button>
				)}

				{enableGoogleLogin && (
					<Button type="button" onClick={loginWithGoogle} variant="outline" className="gap-2" disabled={isLoading}>
						<GoogleIcon />
						{t("auth.continueGoogle")}
					</Button>
				)}

				{success && <p className="text-sm text-(--accent)">{success}</p>}
				{error && <p className="text-sm text-(--danger)">{error}</p>}
			</form>
		</div>
	);
}
