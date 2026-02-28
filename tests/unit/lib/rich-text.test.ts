import {
	clampPlainText,
	sanitizeForRender,
	sanitizeForStorage,
	toPlainText,
	validatePlainTextLength,
} from "@/lib/rich-text";

describe("rich-text utilities", () => {
	it("sanitizes unsafe markup from storage payloads", () => {
		const value = `<p>Hello</p><script>alert("xss")</script><a href="javascript:alert(1)">Unsafe</a>`;
		const sanitized = sanitizeForStorage(value);

		expect(sanitized).not.toContain("<script");
		expect(sanitized).not.toContain("javascript:");
		expect(sanitized).toContain("<p>Hello</p>");
	});

	it("normalizes plain text to paragraph html for rendering", () => {
		const value = "Line one\n\nLine two";
		const rendered = sanitizeForRender(value);

		expect(rendered).toContain("<p>Line one</p>");
		expect(rendered).toContain("<p>Line two</p>");
	});

	it("computes plain text and validates semantic length", () => {
		const value = "<p>Hello <strong>World</strong></p>";
		expect(toPlainText(value)).toBe("Hello World");
		expect(validatePlainTextLength(value, { min: 3, max: 20 })).toBe(true);
		expect(validatePlainTextLength(value, { min: 12, max: 20 })).toBe(false);
	});

	it("creates plain-text previews with clamp", () => {
		const value = "<p>1234567890</p>";
		expect(clampPlainText(value, 6)).toBe("12345…");
	});
});
