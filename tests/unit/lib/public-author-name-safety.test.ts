import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public author-name safety regression", () => {
	it("queries profile display fields without selecting email fallback", () => {
		const source = readFileSync("src/lib/queries.ts", "utf8");

		expect(source).toContain('.select("id, display_name, mention_handle")');
		expect(source).toContain('profile.display_name || profile.mention_handle || "Unknown author"');
		expect(source).not.toContain('.select("id, display_name, email")');
		expect(source).not.toContain("profile.display_name || profile.email");
	});
});
