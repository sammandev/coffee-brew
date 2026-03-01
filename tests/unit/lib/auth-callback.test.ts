import { describe, expect, it } from "vitest";
import { normalizeAuthCallbackNextPath } from "@/lib/auth-callback";

describe("normalizeAuthCallbackNextPath", () => {
	it("keeps valid internal paths", () => {
		expect(normalizeAuthCallbackNextPath("/session/resolve")).toBe("/session/resolve");
		expect(normalizeAuthCallbackNextPath("/dashboard?tab=profile")).toBe("/dashboard?tab=profile");
	});

	it("rejects protocol-relative and non-path values", () => {
		expect(normalizeAuthCallbackNextPath("//evil.example")).toBe("/session/resolve");
		expect(normalizeAuthCallbackNextPath("https://evil.example")).toBe("/session/resolve");
		expect(normalizeAuthCallbackNextPath("javascript:alert(1)")).toBe("/session/resolve");
	});

	it("rejects control characters and backslashes", () => {
		expect(normalizeAuthCallbackNextPath("/path\\evil")).toBe("/session/resolve");
		expect(normalizeAuthCallbackNextPath("/path\nnext")).toBe("/session/resolve");
	});
});
