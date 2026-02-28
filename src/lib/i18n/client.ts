import {
	LOCALE_COOKIE_NAME,
	type Locale,
	parseLocale,
	parseThemePreference,
	THEME_COOKIE_NAME,
	type ThemePreference,
} from "@/lib/i18n/types";

function readCookie(name: string) {
	if (typeof document === "undefined") {
		return null;
	}

	const value = document.cookie
		.split("; ")
		.find((cookieValue) => cookieValue.startsWith(`${name}=`))
		?.split("=")[1];

	return value ? decodeURIComponent(value) : null;
}

export function getClientLocale(): Locale {
	return parseLocale(readCookie(LOCALE_COOKIE_NAME));
}

export function getClientThemePreference(): ThemePreference {
	return parseThemePreference(readCookie(THEME_COOKIE_NAME));
}

export async function setPreferenceCookie(name: string, value: string) {
	if (typeof document === "undefined") {
		return;
	}

	const maxAgeSeconds = 31_536_000;
	const expires = Date.now() + maxAgeSeconds * 1000;

	if (typeof window !== "undefined" && "cookieStore" in window) {
		await window.cookieStore.set({
			name,
			value,
			path: "/",
			expires,
			sameSite: "lax",
		});

		return;
	}

	// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not supported in all target browsers.
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
	return preference;
}
