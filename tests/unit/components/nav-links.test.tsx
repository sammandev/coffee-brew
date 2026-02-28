import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { NavLinks } from "@/components/layout/nav-links";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
	usePathname: () => mockUsePathname(),
}));

vi.mock("@/components/providers/app-preferences-provider", () => ({
	useAppPreferences: () => ({
		locale: "en",
		t: (key: string) => {
			const labels: Record<string, string> = {
				"nav.home": "Home",
				"nav.catalog": "Catalog",
				"nav.forum": "Forum",
				"nav.blog": "Blog",
				"nav.about": "About",
				"nav.contact": "Contact",
			};

			return labels[key] ?? key;
		},
	}),
}));

describe("NavLinks", () => {
	it("highlights active parent tab for nested routes", () => {
		mockUsePathname.mockReturnValue("/blog/pour-over-basics");

		render(<NavLinks />);

		expect(screen.getByRole("link", { name: "Blog" })).toHaveClass("font-semibold");
		expect(screen.getByRole("link", { name: "Catalog" })).not.toHaveClass("font-semibold");
	});

	it("never renders privileged dashboard links in top nav", () => {
		mockUsePathname.mockReturnValue("/dashboard");

		render(
			<NavLinks
				baseLinks={[
					{ href: "/", label_en: "Home", label_id: "Beranda", is_visible: true },
					{ href: "/dashboard", label_en: "Dashboard", label_id: "Dasbor", is_visible: true },
					{ href: "/admin", label_en: "Admin", label_id: "Admin", is_visible: true },
					{ href: "/superuser", label_en: "Superuser", label_id: "Superuser", is_visible: true },
				]}
			/>,
		);

		expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Superuser" })).not.toBeInTheDocument();
	});
});
