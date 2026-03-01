export const AUTH_CALLBACK_NONCE_COOKIE = "cb_auth_nonce";
export const AUTH_CALLBACK_NONCE_TTL_SECONDS = 10 * 60;

export function normalizeAuthCallbackNextPath(rawNext: string | null | undefined) {
	const value = typeof rawNext === "string" ? rawNext.trim() : "";
	if (!value.startsWith("/") || value.startsWith("//")) {
		return "/session/resolve";
	}

	const hasControlCharacter = Array.from(value).some((char) => {
		const code = char.charCodeAt(0);
		return code < 0x20 || code === 0x7f;
	});

	if (value.includes("\\") || hasControlCharacter) {
		return "/session/resolve";
	}

	if (/^\/(?:https?:|javascript:|data:)/i.test(value)) {
		return "/session/resolve";
	}
	return value;
}

export function isAllowedOtpType(
	type: string | null | undefined,
): type is "signup" | "magiclink" | "recovery" | "email" {
	return type === "signup" || type === "magiclink" || type === "recovery" || type === "email";
}
