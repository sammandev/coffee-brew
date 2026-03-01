import { serverEnv } from "@/lib/config/server";
import { toPlainText } from "@/lib/rich-text";

const SUSPICIOUS_KEYWORDS = ["viagra", "casino", "crypto pump", "loan guaranteed", "click here now", "telegram @"];

export function countExternalLinks(content: string) {
	const matches = content.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
	return matches.length;
}

export function isSuspiciousForumContent(content: string) {
	const plain = toPlainText(content).toLowerCase();
	const links = countExternalLinks(content);
	const hasKeyword = SUSPICIOUS_KEYWORDS.some((keyword) => plain.includes(keyword));
	return links >= 4 || hasKeyword;
}

export async function verifyTurnstileToken(token: string | null | undefined, remoteIp?: string | null) {
	if (!serverEnv.TURNSTILE_SECRET_KEY) {
		if (process.env.NODE_ENV === "production") {
			return { ok: false, skipped: false as const, error: "Turnstile is not configured." };
		}
		return { ok: true, skipped: true as const };
	}

	if (!token || token.trim().length === 0) {
		return { ok: false, skipped: false as const, error: "Missing Turnstile token." };
	}

	const formData = new URLSearchParams();
	formData.set("secret", serverEnv.TURNSTILE_SECRET_KEY);
	formData.set("response", token);
	if (remoteIp) {
		formData.set("remoteip", remoteIp);
	}

	const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: formData.toString(),
	}).catch(() => null);

	if (!response?.ok) {
		return { ok: false, skipped: false as const, error: "Turnstile verification failed." };
	}

	const payload = (await response.json().catch(() => ({}))) as {
		success?: boolean;
		"error-codes"?: string[];
	};

	if (payload.success) {
		return { ok: true, skipped: false as const };
	}

	return {
		ok: false,
		skipped: false as const,
		error: `Turnstile rejected request${payload["error-codes"]?.length ? `: ${payload["error-codes"].join(", ")}` : "."}`,
	};
}
