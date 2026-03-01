"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { getPreparedAuthCallbackUrl } from "@/lib/auth-callback-client";
import { MAGIC_LINK_COOLDOWN_KEY } from "@/lib/auth-diagnostics";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginMode = "password" | "magic";

interface LoginFormProps {
	enableGoogleLogin?: boolean;
	enableMagicLinkLogin?: boolean;
	redirectPath?: string;
}

const MAGIC_LINK_COOLDOWN_MS = 60_000;

function buildResolvePath(redirectPath?: string) {
	if (!redirectPath) return "/session/resolve";
	return `/session/resolve?next=${encodeURIComponent(redirectPath)}`;
}

export function LoginForm({ enableGoogleLogin = true, enableMagicLinkLogin = true, redirectPath }: LoginFormProps) {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const [mode, setMode] = useState<LoginMode>("password");
	const [isLoading, setIsLoading] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [magicCooldownUntil, setMagicCooldownUntil] = useState<number | null>(null);
	const [magicCooldownSeconds, setMagicCooldownSeconds] = useState(0);

	useEffect(() => {
		const raw = window.sessionStorage.getItem(MAGIC_LINK_COOLDOWN_KEY);
		if (!raw) return;
		const parsed = Number.parseInt(raw, 10);
		if (Number.isFinite(parsed) && parsed > Date.now()) {
			setMagicCooldownUntil(parsed);
		}
	}, []);

	useEffect(() => {
		if (!magicCooldownUntil) {
			setMagicCooldownSeconds(0);
			return;
		}

		const tick = () => {
			const remainingMs = magicCooldownUntil - Date.now();
			if (remainingMs <= 0) {
				setMagicCooldownUntil(null);
				setMagicCooldownSeconds(0);
				window.sessionStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);
				return;
			}
			setMagicCooldownSeconds(Math.ceil(remainingMs / 1000));
		};

		tick();
		const interval = window.setInterval(tick, 1000);
		return () => window.clearInterval(interval);
	}, [magicCooldownUntil]);

	function startMagicCooldown(ms: number) {
		const until = Date.now() + ms;
		setMagicCooldownUntil(until);
		window.sessionStorage.setItem(MAGIC_LINK_COOLDOWN_KEY, String(until));
	}

	function isMagicLinkRateLimited(message: string) {
		const normalized = message.toLowerCase();
		return (
			normalized.includes("rate limit") ||
			normalized.includes("too many requests") ||
			normalized.includes("try again later")
		);
	}

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

			router.push(buildResolvePath(redirectPath));
			router.refresh();
			return;
		}

		if (!enableMagicLinkLogin) {
			setError("Magic link login is disabled.");
			setIsLoading(false);
			return;
		}

		if (magicCooldownSeconds > 0) {
			setError(
				locale === "id"
					? `Terlalu banyak permintaan magic link. Coba lagi dalam ${magicCooldownSeconds} detik.`
					: `Too many magic link requests. Try again in ${magicCooldownSeconds} seconds.`,
			);
			setIsLoading(false);
			return;
		}

		let callbackUrl: string;
		try {
			callbackUrl = await getPreparedAuthCallbackUrl(buildResolvePath(redirectPath));
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Could not prepare secure authentication callback.");
			setIsLoading(false);
			return;
		}

		const { error: authError } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: callbackUrl,
			},
		});

		if (authError) {
			if (isMagicLinkRateLimited(authError.message)) {
				startMagicCooldown(MAGIC_LINK_COOLDOWN_MS);
				setError(
					locale === "id"
						? "Batas pengiriman magic link tercapai. Coba lagi dalam 60 detik."
						: "Magic link rate limit reached. Please retry in 60 seconds.",
				);
			} else {
				setError(authError.message);
			}
			setIsLoading(false);
			return;
		}

		setSuccess(t("auth.magicLinkSent"));
		setIsLoading(false);
	}

	async function loginWithGoogle() {
		setError(null);
		setSuccess(null);

		try {
			const supabase = createSupabaseBrowserClient();
			const callbackUrl = await getPreparedAuthCallbackUrl(buildResolvePath(redirectPath));
			const { error: authError } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: callbackUrl,
				},
			});

			if (authError) {
				setError(authError.message);
			}
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Could not prepare secure authentication callback.");
		}
	}

	return (
		<div className="grid gap-5">
			<form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-6">
				<h2 className="font-heading text-2xl text-(--espresso)">{t("auth.signIn")}</h2>

				<div>
					<Label htmlFor="login-email">Email</Label>
					<Input id="login-email" name="email" type="email" autoComplete="email" required />
				</div>
				{mode === "password" && (
					<div>
						<Label htmlFor="password">Password</Label>
						<PasswordInput
							id="password"
							name="password"
							autoComplete="current-password"
							required
							minLength={8}
							showLabel={t("auth.showPassword")}
							hideLabel={t("auth.hidePassword")}
						/>
					</div>
				)}
				<Button type="submit" disabled={isLoading || (mode === "magic" && magicCooldownSeconds > 0)}>
					{mode === "password"
						? isLoading
							? t("auth.signingIn")
							: t("auth.signInWithEmail")
						: magicCooldownSeconds > 0
							? locale === "id"
								? `Coba lagi ${magicCooldownSeconds}d`
								: `Retry in ${magicCooldownSeconds}s`
							: t("auth.sendMagicLink")}
				</Button>
				{mode === "magic" && magicCooldownSeconds > 0 ? (
					<p className="text-xs text-(--muted)">
						{locale === "id"
							? `Pengiriman magic link dibatasi sementara. Silakan tunggu ${magicCooldownSeconds} detik.`
							: `Magic link requests are temporarily throttled. Please wait ${magicCooldownSeconds} seconds.`}
					</p>
				) : null}

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
