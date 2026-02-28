import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";

describe("hasPermission", () => {
	it("allows user to create brews", () => {
		expect(hasPermission("user", "brews", "create")).toBe(true);
	});

	it("denies user managing users", () => {
		expect(hasPermission("user", "users", "manage_users")).toBe(false);
	});

	it("supports custom permission matrix", () => {
		const matrix = [{ resource: "forum", action: "moderate" }] as const;
		expect(hasPermission("admin", "forum", "moderate", [...matrix])).toBe(true);
	});

	it("superuser matrix includes user management", () => {
		expect(
			DEFAULT_ROLE_PERMISSIONS.superuser.some(
				(permission) => permission.resource === "users" && permission.action === "manage_users",
			),
		).toBe(true);
	});
});
