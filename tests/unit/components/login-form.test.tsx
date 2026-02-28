import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { LoginForm } from "@/components/forms/login-form";

const mockRefresh = vi.fn();
const mockPush = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignInWithOAuth = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: mockRefresh,
		push: mockPush,
	}),
}));

vi.mock("@/lib/supabase/browser", () => ({
	createSupabaseBrowserClient: () => ({
		auth: {
			signInWithPassword: mockSignInWithPassword,
			signInWithOtp: mockSignInWithOtp,
			signInWithOAuth: mockSignInWithOAuth,
		},
	}),
}));

vi.mock("@/components/providers/app-preferences-provider", () => ({
	useAppPreferences: () => ({
		t: (key: string) => {
			const labels: Record<string, string> = {
				"auth.signIn": "Sign In",
				"auth.signInWithEmail": "Sign in with Email",
				"auth.sendMagicLink": "Send Magic Link",
				"auth.continueMagicLink": "Continue with Magic Link",
				"auth.continuePassword": "Continue with Email + Password",
				"auth.continueGoogle": "Continue with Google",
				"auth.orContinueWith": "Or continue with",
				"auth.loginModePassword": "Email + Password",
				"auth.loginModeMagic": "Magic Link",
				"auth.loginModePasswordHelp": "Use your email and password to sign in instantly.",
				"auth.loginModeMagicHelp": "Use a one-time link sent to your email inbox.",
				"auth.magicLinkSent": "Magic link sent. Check your inbox.",
				"auth.signingIn": "Signing in...",
			};

			return labels[key] ?? key;
		},
	}),
}));

describe("LoginForm", () => {
	beforeEach(() => {
		mockRefresh.mockReset();
		mockPush.mockReset();
		mockSignInWithPassword.mockReset();
		mockSignInWithOtp.mockReset();
		mockSignInWithOAuth.mockReset();
	});

	it("uses a single form and toggles to magic-link mode with only email field", () => {
		const { container } = render(<LoginForm />);
		expect(container.querySelectorAll("form")).toHaveLength(1);
		expect(screen.getByLabelText("Password")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Continue with Magic Link" }));

		expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Send Magic Link" })).toBeInTheDocument();
	});

	it("submits magic-link mode with email only", async () => {
		mockSignInWithOtp.mockResolvedValue({ error: null });
		render(<LoginForm />);

		fireEvent.click(screen.getByRole("button", { name: "Continue with Magic Link" }));
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: "brew@example.com" } });
		fireEvent.click(screen.getByRole("button", { name: "Send Magic Link" }));

		await waitFor(() => {
			expect(mockSignInWithOtp).toHaveBeenCalled();
		});
		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(screen.getByText("Magic link sent. Check your inbox.")).toBeInTheDocument();
	});

	it("places the magic-link button above the google button", () => {
		render(<LoginForm />);

		const form = screen.getByRole("button", { name: "Continue with Google" }).closest("form") as HTMLFormElement;
		const magicButton = within(form).getByRole("button", { name: "Continue with Magic Link" });
		const googleButton = within(form).getByRole("button", { name: "Continue with Google" });
		const formButtons = within(form).getAllByRole("button");
		const magicIndex = formButtons.indexOf(magicButton);
		const googleIndex = formButtons.indexOf(googleButton);

		expect(magicIndex).toBeGreaterThan(-1);
		expect(googleIndex).toBeGreaterThan(-1);
		expect(magicIndex).toBeLessThan(googleIndex);
	});

	it("renders Google OAuth button inside the same login form card", () => {
		render(<LoginForm />);

		const googleButton = screen.getByRole("button", { name: "Continue with Google" });
		const form = googleButton.closest("form");

		expect(form).not.toBeNull();
		expect(within(form as HTMLFormElement).getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
	});
});
