export async function getPreparedAuthCallbackUrl(nextPath: string) {
	const response = await fetch("/api/auth/prepare-callback", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ next: nextPath, flow: "callback" }),
	});

	if (!response.ok) {
		throw new Error("Could not prepare secure auth callback.");
	}

	const body = (await response.json().catch(() => null)) as { callbackUrl?: string } | null;
	if (!body?.callbackUrl || typeof body.callbackUrl !== "string") {
		throw new Error("Could not prepare secure auth callback.");
	}

	return body.callbackUrl;
}

export async function getPreparedOneTapNonce(nextPath?: string) {
	const response = await fetch("/api/auth/prepare-callback", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ next: nextPath ?? "/session/resolve", flow: "one_tap" }),
	});

	if (!response.ok) {
		throw new Error("Could not prepare secure one-tap nonce.");
	}

	const body = (await response.json().catch(() => null)) as { oneTapNonce?: string } | null;
	if (!body?.oneTapNonce || typeof body.oneTapNonce !== "string") {
		throw new Error("Could not prepare secure one-tap nonce.");
	}

	return body.oneTapNonce;
}
