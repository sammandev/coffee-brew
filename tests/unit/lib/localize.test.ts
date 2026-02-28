import { resolveLocalizedConfig, resolveLocalizedText } from "@/lib/i18n/localize";

describe("localized fallback resolver", () => {
	it("prefers indonesian value when locale is id", () => {
		expect(resolveLocalizedText("id", "English", "Indonesia")).toBe("Indonesia");
	});

	it("falls back to english when indonesian value is empty", () => {
		expect(resolveLocalizedText("id", "English", "")).toBe("English");
	});

	it("merges config with locale override for id", () => {
		const config = resolveLocalizedConfig("id", { ctaText: "Explore", ctaLink: "/catalog" }, { ctaText: "Lihat" });

		expect(config).toEqual({ ctaText: "Lihat", ctaLink: "/catalog" });
	});
});
