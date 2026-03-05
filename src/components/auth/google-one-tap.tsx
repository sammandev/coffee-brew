"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ONE_TAP_ERROR_KEY, ONE_TAP_STATUS_KEY } from "@/lib/auth-diagnostics";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const GOOGLE_ONE_TAP_SCRIPT_ID = "google-one-tap-client";
const ONE_TAP_PROMPT_KEY = "cb_google_one_tap_prompt_at";
const ONE_TAP_PROMPT_THROTTLE_MS = 30_000;

interface GoogleCredentialResponse {
	credential?: string;
}

interface GoogleOneTapProps {
	enabled: boolean;
	redirectPath?: string;
	googleClientId?: string | null;
	showVerification?: boolean;
	locale?: "en" | "id";
}

type OneTapStatus = "idle" | "disabled" | "missing_client_id" | "ready" | "prompted" | "unavailable" | "error";

declare global {
	interface Window {
		google?: {
			accounts?: {
				id?: {
					initialize: (options: {
						client_id: string;
						callback: (response: GoogleCredentialResponse) => void;
						auto_select?: boolean;
						cancel_on_tap_outside?: boolean;
						use_fedcm_for_prompt?: boolean;
					}) => void;
					prompt: () => void;
					cancel: () => void;
				};
			};
		};
	}
}

function resolveSessionPath(redirectPath?: string) {
	if (!redirectPath) return "/session/resolve";
	return `/session/resolve?next=${encodeURIComponent(redirectPath)}`;
}

function loadGoogleOneTapScript() {
	return new Promise<void>((resolve, reject) => {
		if (window.google?.accounts?.id) {
			resolve();
			return;
		}

		const existingScript = document.getElementById(GOOGLE_ONE_TAP_SCRIPT_ID) as HTMLScriptElement | null;
		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(), { once: true });
			existingScript.addEventListener("error", () => reject(new Error("Google One Tap script failed to load.")), {
				once: true,
			});
			return;
		}

		const script = document.createElement("script");
		script.id = GOOGLE_ONE_TAP_SCRIPT_ID;
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Google One Tap script failed to load."));
		document.head.append(script);
	});
}

export function GoogleOneTap({
	enabled,
	redirectPath,
	googleClientId,
	showVerification = false,
	locale = "en",
}: GoogleOneTapProps) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [hint, setHint] = useState<string | null>(null);
	const [status, setStatus] = useState<OneTapStatus>("idle");

	const setOneTapStatus = useCallback((nextStatus: OneTapStatus) => {
		setStatus(nextStatus);
		window.sessionStorage.setItem(ONE_TAP_STATUS_KEY, nextStatus);
	}, []);

	const setOneTapError = useCallback((value: string | null) => {
		if (value) {
			window.sessionStorage.setItem(ONE_TAP_ERROR_KEY, value);
			return;
		}
		window.sessionStorage.removeItem(ONE_TAP_ERROR_KEY);
	}, []);

	const resolvedClientId = useMemo(() => {
		const candidate = googleClientId?.trim() ?? "";
		return candidate.length > 0 ? candidate : null;
	}, [googleClientId]);

	const isConfigured = useMemo(() => enabled && Boolean(resolvedClientId), [enabled, resolvedClientId]);

	useEffect(() => {
		setError(null);
		setHint(null);
		setOneTapError(null);

		if (!enabled) {
			setOneTapStatus("disabled");
			return;
		}

		if (!resolvedClientId) {
			setOneTapStatus("missing_client_id");
			return;
		}

		let active = true;
		const supabase = createSupabaseBrowserClient();

		async function startOneTap() {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!active || session) return;

			const lastPromptRaw = window.sessionStorage.getItem(ONE_TAP_PROMPT_KEY);
			const lastPromptAt = Number.parseInt(lastPromptRaw ?? "0", 10);
			if (Number.isFinite(lastPromptAt) && Date.now() - lastPromptAt < ONE_TAP_PROMPT_THROTTLE_MS) {
				setOneTapStatus("ready");
				return;
			}

			await loadGoogleOneTapScript();
			if (!active || !window.google?.accounts?.id || !resolvedClientId) return;
			setOneTapStatus("ready");

			window.google.accounts.id.initialize({
				client_id: resolvedClientId,
				auto_select: false,
				cancel_on_tap_outside: true,
				use_fedcm_for_prompt: true,
				callback: async (response) => {
					if (!response.credential) {
						setError(
							locale === "id"
								? "Google One Tap gagal digunakan. Silakan coba lagi."
								: "Google One Tap sign-in failed. Please try again.",
						);
						setOneTapStatus("error");
						setHint(
							locale === "id"
								? "Jika One Tap gagal, lanjutkan dengan tombol Continue with Google."
								: "If One Tap fails, continue with the Continue with Google button.",
						);
						return;
					}

					const { error: signInError } = await supabase.auth.signInWithIdToken({
						provider: "google",
						token: response.credential,
					});

					if (signInError) {
						setError(signInError.message);
						setOneTapStatus("error");
						setOneTapError("generic_error");
						setHint(
							locale === "id" ? "Silakan coba tombol Continue with Google." : "Please try the Continue with Google button.",
						);
						return;
					}
					setOneTapError(null);

					router.push(resolveSessionPath(redirectPath));
					router.refresh();
				},
			});

			window.google.accounts.id.prompt();
			setOneTapStatus("prompted");
			window.sessionStorage.setItem(ONE_TAP_PROMPT_KEY, String(Date.now()));
		}

		void startOneTap().catch((caughtError) => {
			if (!active) return;
			setOneTapError("generic_error");
			setError(
				caughtError instanceof Error
					? caughtError.message
					: locale === "id"
						? "Google One Tap gagal digunakan. Silakan coba lagi."
						: "Google One Tap sign-in failed. Please try again.",
			);
			setOneTapStatus("error");
			setHint(
				locale === "id"
					? "Silakan lanjutkan dengan tombol Continue with Google."
					: "Please continue with the Continue with Google button.",
			);
		});

		return () => {
			active = false;
			window.google?.accounts?.id?.cancel();
		};
	}, [enabled, locale, redirectPath, resolvedClientId, router, setOneTapError, setOneTapStatus]);

	if (!showVerification) {
		if (!isConfigured || !error) return null;
		return <p className="text-sm text-(--danger)">{error}</p>;
	}

	const statusMessage =
		status === "idle"
			? locale === "id"
				? "Memeriksa konfigurasi Google One Tap..."
				: "Checking Google One Tap configuration..."
			: status === "disabled"
				? locale === "id"
					? "Google login dinonaktifkan oleh pengaturan situs."
					: "Google login is disabled by site settings."
				: status === "missing_client_id"
					? locale === "id"
						? "Google One Tap belum aktif. Tambahkan NEXT_PUBLIC_GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_ID."
						: "Google One Tap is not active yet. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID."
					: status === "prompted"
						? locale === "id"
							? "Google One Tap siap dan sedang diprompt."
							: "Google One Tap is configured and prompted."
						: status === "ready"
							? locale === "id"
								? "Google One Tap siap digunakan."
								: "Google One Tap is configured and ready."
							: status === "unavailable"
								? locale === "id"
									? "Google One Tap tidak tersedia pada sesi ini."
									: "Google One Tap is unavailable in this session."
								: null;

	return (
		<div className="space-y-1">
			{statusMessage ? <p className="text-xs text-(--muted)">{statusMessage}</p> : null}
			{hint ? <p className="text-xs text-(--muted)">{hint}</p> : null}
			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
		</div>
	);
}
