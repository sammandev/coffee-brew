"use client";

import { Moon, Sun } from "lucide-react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Select } from "@/components/ui/select";

export function PreferenceControls() {
	const { locale, setLocale, themePreference, setThemePreference, t } = useAppPreferences();

	function toggleTheme() {
		setThemePreference(themePreference === "light" ? "dark" : "light");
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<label className="sr-only" htmlFor="locale-select">
				{t("prefs.language")}
			</label>
			<Select
				id="locale-select"
				className="h-9 w-auto min-w-32 rounded-full px-3"
				value={locale}
				onChange={(event) => setLocale(event.currentTarget.value as "en" | "id")}
			>
				<option value="en">{t("prefs.lang.en")}</option>
				<option value="id">{t("prefs.lang.id")}</option>
			</Select>

			<button
				type="button"
				onClick={toggleTheme}
				className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--sand)]/20"
				aria-label={`${t("prefs.theme")}: ${themePreference}`}
				aria-pressed={themePreference === "dark"}
			>
				{themePreference === "light" ? <Moon size={15} /> : <Sun size={15} />}
				<span className="hidden sm:inline">
					{themePreference === "light" ? t("prefs.theme.dark") : t("prefs.theme.light")}
				</span>
			</button>
		</div>
	);
}
