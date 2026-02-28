"use client";

import { Moon, Sun } from "lucide-react";
import { useId } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Select } from "@/components/ui/select";

export function PreferenceControls() {
	const localeSelectId = useId();
	const { locale, setLocale, themePreference, setThemePreference, t } = useAppPreferences();

	function toggleTheme() {
		setThemePreference(themePreference === "light" ? "dark" : "light");
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<label className="sr-only" htmlFor={localeSelectId}>
				{t("prefs.language")}
			</label>
			<Select
				id={localeSelectId}
				className="h-9 w-fit min-w-0 rounded-lg px-2"
				menuAlign="end"
				menuClassName="max-h-64 overflow-auto"
				value={locale}
				showIndicator={false}
				onChange={(event) => setLocale(event.currentTarget.value as "en" | "id")}
			>
				<option value="en">EN</option>
				<option value="id">ID</option>
			</Select>

			<button
				type="button"
				onClick={toggleTheme}
				className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--sand)]/20"
				aria-label={`${t("prefs.theme")}: ${themePreference}`}
				aria-pressed={themePreference === "dark"}
			>
				{themePreference === "light" ? <Moon size={15} /> : <Sun size={15} />}
			</button>
		</div>
	);
}
