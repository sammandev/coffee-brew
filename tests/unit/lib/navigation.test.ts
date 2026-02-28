import { isActivePath, navItemClassName } from "@/lib/navigation";

describe("navigation helpers", () => {
	it("marks root path active only on exact slash", () => {
		expect(isActivePath("/", "/")).toBe(true);
		expect(isActivePath("/catalog", "/")).toBe(false);
	});

	it("marks nested routes active for a parent href", () => {
		expect(isActivePath("/blog/hello", "/blog")).toBe(true);
		expect(isActivePath("/forum/abc", "/forum")).toBe(true);
		expect(isActivePath("/dashboard", "/blog")).toBe(false);
	});

	it("returns active classes for mobile and desktop modes", () => {
		expect(navItemClassName(true, false)).toContain("font-semibold");
		expect(navItemClassName(true, true)).toContain("font-semibold");
	});
});
