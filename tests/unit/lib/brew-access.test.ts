import { describe, expect, it } from "vitest";
import { canAccessBrew, canReadUnpublishedBrew } from "@/lib/brew-access";

describe("brew unpublished access matrix", () => {
	it("denies unpublished access for anonymous users", () => {
		expect(canReadUnpublishedBrew(null)).toBe(false);
		expect(canAccessBrew("draft", null)).toBe(false);
		expect(canAccessBrew("hidden", null)).toBe(false);
	});

	it("denies unpublished access for regular users", () => {
		expect(canReadUnpublishedBrew("user")).toBe(false);
		expect(canAccessBrew("draft", "user")).toBe(false);
		expect(canAccessBrew("hidden", "user")).toBe(false);
	});

	it("allows unpublished access for admin users", () => {
		expect(canReadUnpublishedBrew("admin")).toBe(true);
		expect(canAccessBrew("draft", "admin")).toBe(true);
		expect(canAccessBrew("hidden", "admin")).toBe(true);
	});

	it("allows unpublished access for superusers", () => {
		expect(canReadUnpublishedBrew("superuser")).toBe(true);
		expect(canAccessBrew("draft", "superuser")).toBe(true);
		expect(canAccessBrew("hidden", "superuser")).toBe(true);
	});

	it("always allows published brews", () => {
		expect(canAccessBrew("published", null)).toBe(true);
		expect(canAccessBrew("published", "user")).toBe(true);
		expect(canAccessBrew("published", "admin")).toBe(true);
	});
});
