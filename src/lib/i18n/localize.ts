import type { Locale } from "@/lib/i18n/types";

export function resolveLocalizedText(
	locale: Locale,
	englishValue: string | null | undefined,
	indonesianValue: string | null | undefined,
) {
	if (locale === "id" && indonesianValue && indonesianValue.trim().length > 0) {
		return indonesianValue;
	}

	return englishValue ?? indonesianValue ?? "";
}

export function resolveLocalizedConfig(
	locale: Locale,
	englishConfig: Record<string, unknown> | null | undefined,
	indonesianConfig: Record<string, unknown> | null | undefined,
) {
	const base = englishConfig ?? {};

	if (locale !== "id") {
		return base;
	}

	return {
		...base,
		...(indonesianConfig ?? {}),
	};
}
