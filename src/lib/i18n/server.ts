import { cookies } from "next/headers";
import { getMessage, MESSAGES, type MessageKey } from "@/lib/i18n/messages";
import {
	LOCALE_COOKIE_NAME,
	type Locale,
	parseLocale,
	parseThemePreference,
	THEME_COOKIE_NAME,
	type ThemePreference,
} from "@/lib/i18n/types";

export async function getServerPreferences(): Promise<{ locale: Locale; themePreference: ThemePreference }> {
	const cookieStore = await cookies();
	const locale = parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
	const themePreference = parseThemePreference(cookieStore.get(THEME_COOKIE_NAME)?.value);

	return {
		locale,
		themePreference,
	};
}

export async function getServerI18n() {
	const { locale, themePreference } = await getServerPreferences();

	return {
		locale,
		themePreference,
		messages: MESSAGES[locale],
		fallbackMessages: MESSAGES.en,
		t: (key: MessageKey) => getMessage(locale, key),
	};
}
