import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { NavLinks } from "@/components/layout/nav-links";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
	usePathname: () => mockUsePathname(),
}));

vi.mock("@/components/providers/app-preferences-provider", () => ({
	useAppPreferences: () => ({
		t: (key: string) => {
			const labels: Record<string, string> = {
				"nav.home": "Home",
				"nav.catalog": "Catalog",
				"nav.forum": "Forum",
				"nav.blog": "Blog",
				"nav.about": "About",
				"nav.contact": "Contact",
				"nav.dashboard": "Dashboard",
				"nav.admin": "Admin",
				"nav.superuser": "Superuser",
			};

			return labels[key] ?? key;
		},
	}),
}));

describe("NavLinks", () => {
	it("highlights active parent tab for nested routes", () => {
		mockUsePathname.mockReturnValue("/blog/pour-over-basics");

		render(<NavLinks includeDashboard={false} includeAdmin={false} includeSuperuser={false} />);

		expect(screen.getByRole("link", { name: "Blog" })).toHaveClass("font-semibold");
		expect(screen.getByRole("link", { name: "Catalog" })).not.toHaveClass("font-semibold");
	});

	it("includes role-aware links when enabled", () => {
		mockUsePathname.mockReturnValue("/dashboard");

		render(<NavLinks includeDashboard includeAdmin includeSuperuser />);

		expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Superuser" })).toBeInTheDocument();
	});
});
