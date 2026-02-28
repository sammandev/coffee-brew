import { resolveTheme } from "@/lib/i18n/client";
import { parseLocale, parseThemePreference } from "@/lib/i18n/types";

describe("i18n preference parsing", () => {
	it("parses valid locale and falls back to en", () => {
		expect(parseLocale("id")).toBe("id");
		expect(parseLocale("en")).toBe("en");
		expect(parseLocale("de")).toBe("en");
		expect(parseLocale(undefined)).toBe("en");
	});

	it("parses valid theme and falls back to light", () => {
		expect(parseThemePreference("dark")).toBe("dark");
		expect(parseThemePreference("light")).toBe("light");
		expect(parseThemePreference("system")).toBe("light");
		expect(parseThemePreference("sepia")).toBe("light");
		expect(parseThemePreference(null)).toBe("light");
	});
});

describe("resolveTheme", () => {
	it("returns explicit dark and light preferences", () => {
		expect(resolveTheme("dark")).toBe("dark");
		expect(resolveTheme("light")).toBe("light");
	});
});
