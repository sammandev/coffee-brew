"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { setPreferenceCookie } from "@/lib/i18n/client";
import { getMessage, MESSAGES, type MessageKey } from "@/lib/i18n/messages";
import { LOCALE_COOKIE_NAME, type Locale, THEME_COOKIE_NAME, type ThemePreference } from "@/lib/i18n/types";

interface AppPreferencesValue {
	locale: Locale;
	setLocale: (nextLocale: Locale) => void;
	themePreference: ThemePreference;
	setThemePreference: (nextThemePreference: ThemePreference) => void;
	resolvedTheme: "light" | "dark";
	t: (key: MessageKey) => string;
}

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

interface AppPreferencesProviderProps {
	children: React.ReactNode;
	initialLocale: Locale;
	initialThemePreference: ThemePreference;
}

function resolveInitialTheme(initialThemePreference: ThemePreference): ThemePreference {
	if (typeof document !== "undefined") {
		const existingTheme = document.documentElement.dataset.theme;

		if (existingTheme === "light" || existingTheme === "dark") {
			return existingTheme;
		}
	}

	return initialThemePreference;
}

export function AppPreferencesProvider({
	children,
	initialLocale,
	initialThemePreference,
}: AppPreferencesProviderProps) {
	const router = useRouter();
	const [locale, setLocaleState] = useState<Locale>(initialLocale);
	const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() =>
		resolveInitialTheme(initialThemePreference),
	);

	const value = useMemo<AppPreferencesValue>(() => {
		const setLocale = (nextLocale: Locale) => {
			setLocaleState(nextLocale);
			void (async () => {
				await setPreferenceCookie(LOCALE_COOKIE_NAME, nextLocale);
				router.refresh();
			})();
		};

		const setThemePreference = (nextThemePreference: ThemePreference) => {
			setThemePreferenceState(nextThemePreference);
			document.documentElement.dataset.theme = nextThemePreference;
			void setPreferenceCookie(THEME_COOKIE_NAME, nextThemePreference);
		};

		return {
			locale,
			setLocale,
			themePreference,
			setThemePreference,
			resolvedTheme: themePreference,
			t: (key: MessageKey) => getMessage(locale, key),
		};
	}, [locale, router, themePreference]);

	return <AppPreferencesContext value={value}>{children}</AppPreferencesContext>;
}

export function useAppPreferences() {
	const context = useContext(AppPreferencesContext);

	if (!context) {
		throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
	}

	return context;
}

export function useLocaleMessages() {
	const { locale } = useAppPreferences();
	return MESSAGES[locale];
}
