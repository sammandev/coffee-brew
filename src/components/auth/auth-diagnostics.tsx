"use client";

import { useEffect, useMemo, useState } from "react";
import { MAGIC_LINK_COOLDOWN_KEY, ONE_TAP_ERROR_KEY, ONE_TAP_STATUS_KEY } from "@/lib/auth-diagnostics";

interface AuthDiagnosticsProps {
	oneTapClientIdDetected: boolean;
	redirectPath?: string;
}

function resolveSessionPath(redirectPath?: string) {
	if (!redirectPath) return "/session/resolve";
	return `/session/resolve?next=${encodeURIComponent(redirectPath)}`;
}

export function AuthDiagnostics({ oneTapClientIdDetected, redirectPath }: AuthDiagnosticsProps) {
	const isDevelopment = process.env.NODE_ENV === "development";

	const [oneTapStatus, setOneTapStatus] = useState<string>("idle");
	const [oneTapError, setOneTapError] = useState<string | null>(null);
	const [cooldownSeconds, setCooldownSeconds] = useState(0);
	const [origin, setOrigin] = useState("");

	const callbackPath = useMemo(
		() => `/api/auth/callback?next=${encodeURIComponent(resolveSessionPath(redirectPath))}`,
		[redirectPath],
	);

	useEffect(() => {
		if (!isDevelopment) return;

		setOrigin(window.location.origin);

		const tick = () => {
			const status = window.sessionStorage.getItem(ONE_TAP_STATUS_KEY) ?? "idle";
			setOneTapStatus(status);
			setOneTapError(window.sessionStorage.getItem(ONE_TAP_ERROR_KEY));

			const cooldownRaw = window.sessionStorage.getItem(MAGIC_LINK_COOLDOWN_KEY);
			if (!cooldownRaw) {
				setCooldownSeconds(0);
				return;
			}

			const until = Number.parseInt(cooldownRaw, 10);
			if (!Number.isFinite(until)) {
				setCooldownSeconds(0);
				window.sessionStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);
				return;
			}

			const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
			setCooldownSeconds(remaining);
			if (remaining <= 0) {
				window.sessionStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);
			}
		};

		tick();
		const interval = window.setInterval(tick, 1000);
		return () => window.clearInterval(interval);
	}, [isDevelopment]);

	if (!isDevelopment) {
		return null;
	}

	return (
		<div className="rounded-2xl border border-dashed bg-(--surface-elevated) p-4 text-xs text-(--muted)">
			<p className="font-semibold uppercase tracking-wide text-(--espresso)">Auth Diagnostics (dev)</p>
			<div className="mt-2 space-y-1">
				<p>
					<span className="font-medium text-(--espresso)">One Tap client ID detected:</span>{" "}
					{oneTapClientIdDetected ? "yes" : "no"}
				</p>
				<p>
					<span className="font-medium text-(--espresso)">One Tap status:</span> {oneTapStatus}
				</p>
				<p>
					<span className="font-medium text-(--espresso)">One Tap error:</span>{" "}
					{oneTapError === "nonce_mismatch" ? "nonce mismatch (id_token nonce vs passed nonce)" : (oneTapError ?? "none")}
				</p>
				<p>
					<span className="font-medium text-(--espresso)">Callback URL in use:</span> {origin || "(loading...)"}
					{callbackPath}
				</p>
				<p>
					<span className="font-medium text-(--espresso)">Magic Link cooldown remaining:</span>{" "}
					{cooldownSeconds > 0 ? `${cooldownSeconds}s` : "0s"}
				</p>
			</div>
		</div>
	);
}
