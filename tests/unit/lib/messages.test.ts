import { getMessage, MESSAGES } from "@/lib/i18n/messages";

describe("message catalogs", () => {
	it("contains the same keys in english and indonesian dictionaries", () => {
		const enKeys = Object.keys(MESSAGES.en).sort();
		const idKeys = Object.keys(MESSAGES.id).sort();

		expect(idKeys).toEqual(enKeys);
	});

	it("returns localized messages for english and indonesian", () => {
		expect(getMessage("en", "nav.home")).toBe("Home");
		expect(getMessage("id", "nav.home")).toBe("Beranda");
	});
});
