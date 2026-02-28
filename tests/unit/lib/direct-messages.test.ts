import { describe, expect, test } from "vitest";
import { buildDirectMessageKey, canEditDmMessage, parseDmStoragePath } from "@/lib/direct-messages";

describe("direct-messages", () => {
	test("buildDirectMessageKey creates deterministic sorted key", () => {
		const a = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
		const b = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
		expect(buildDirectMessageKey(a, b)).toBe(`${b}:${a}`);
		expect(buildDirectMessageKey(b, a)).toBe(`${b}:${a}`);
	});

	test("canEditDmMessage allows edits within 15 minutes", () => {
		const now = Date.now();
		const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
		const twentyMinutesAgo = new Date(now - 20 * 60 * 1000).toISOString();
		expect(canEditDmMessage(tenMinutesAgo, now)).toBe(true);
		expect(canEditDmMessage(twentyMinutesAgo, now)).toBe(false);
	});

	test("parseDmStoragePath extracts managed dm-media path", () => {
		const url = "https://example.supabase.co/storage/v1/object/public/dm-media/user-x/2026-02-28/file.jpg";
		expect(parseDmStoragePath(url)).toBe("user-x/2026-02-28/file.jpg");
		expect(parseDmStoragePath("https://images.unsplash.com/photo-123")).toBeNull();
	});
});
