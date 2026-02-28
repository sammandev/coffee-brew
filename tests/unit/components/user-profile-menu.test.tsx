import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";

let mockedPathname = "/";

vi.mock("next/navigation", () => ({
	usePathname: () => mockedPathname,
	useRouter: () => ({
		push: vi.fn(),
		refresh: vi.fn(),
	}),
}));

vi.mock("next/image", () => ({
	default: () => <span data-testid="next-image-mock" />,
}));

describe("UserProfileMenu", () => {
	beforeEach(() => {
		mockedPathname = "/";
	});

	it("uses compact rounded rectangle trigger style", () => {
		render(
			<UserProfileMenu
				avatarUrl={null}
				displayName="John Doe"
				email="john@example.com"
				accountRole="user"
				labels={{
					dashboard: "Dashboard",
					profileSettings: "Profile Settings",
					signOut: "Sign Out",
				}}
			/>,
		);

		const trigger = screen.getByRole("button", { name: /John/ });
		expect(trigger).toHaveClass("h-9");
		expect(trigger).toHaveClass("rounded-lg");
	});

	it("closes on outside click and escape", () => {
		render(
			<UserProfileMenu
				avatarUrl={null}
				displayName="John Doe"
				email="john@example.com"
				accountRole="user"
				labels={{
					dashboard: "Dashboard",
					profileSettings: "Profile Settings",
					signOut: "Sign Out",
				}}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /John/ }));
		expect(screen.getByText("John Doe")).toBeInTheDocument();
		expect(screen.getByText("User")).toBeInTheDocument();

		fireEvent.mouseDown(document.body);
		expect(screen.queryByText("John Doe")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /John/ }));
		expect(screen.getByText("John Doe")).toBeInTheDocument();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
	});

	it("closes when pathname changes", () => {
		const { rerender } = render(
			<UserProfileMenu
				avatarUrl={null}
				displayName="John Doe"
				email="john@example.com"
				accountRole="user"
				labels={{
					dashboard: "Dashboard",
					profileSettings: "Profile Settings",
					signOut: "Sign Out",
				}}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /John/ }));
		expect(screen.getByText("John Doe")).toBeInTheDocument();

		mockedPathname = "/dashboard";
		rerender(
			<UserProfileMenu
				avatarUrl={null}
				displayName="John Doe"
				email="john@example.com"
				accountRole="user"
				labels={{
					dashboard: "Dashboard",
					profileSettings: "Profile Settings",
					signOut: "Sign Out",
				}}
			/>,
		);

		expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
	});
});
