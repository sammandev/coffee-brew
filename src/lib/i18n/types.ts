export const SUPPORTED_LOCALES = ["en", "id"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const THEME_PREFERENCES = ["light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const LOCALE_COOKIE_NAME = "cb_locale";
export const THEME_COOKIE_NAME = "cb_theme";

export function isLocale(value: string): value is Locale {
	return SUPPORTED_LOCALES.includes(value as Locale);
}

export function isThemePreference(value: string): value is ThemePreference {
	return THEME_PREFERENCES.includes(value as ThemePreference);
}

export function parseLocale(value: string | null | undefined): Locale {
	if (!value) {
		return "en";
	}

	return isLocale(value) ? value : "en";
}

export function parseThemePreference(value: string | null | undefined): ThemePreference {
	if (!value) {
		return "light";
	}

	return isThemePreference(value) ? value : "light";
}
