import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { SignupForm } from "@/components/forms/signup-form";

const mockRefresh = vi.fn();
const mockPush = vi.fn();
const mockSignUp = vi.fn();
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
			signUp: mockSignUp,
			signInWithOAuth: mockSignInWithOAuth,
		},
	}),
}));

vi.mock("@/components/providers/app-preferences-provider", () => ({
	useAppPreferences: () => ({
		locale: "en",
		t: (key: string) => {
			const labels: Record<string, string> = {
				"auth.createAccount": "Create Account",
				"auth.continueGoogle": "Continue with Google",
				"auth.orContinueWith": "Or continue with",
				"auth.accountCreated": "Account created. Check your email for verification link.",
			};

			return labels[key] ?? key;
		},
	}),
}));

describe("SignupForm", () => {
	beforeEach(() => {
		mockRefresh.mockReset();
		mockPush.mockReset();
		mockSignUp.mockReset();
		mockSignInWithOAuth.mockReset();
	});

	it("renders Google OAuth button inside the same signup form card", () => {
		render(<SignupForm />);

		const googleButton = screen.getByRole("button", { name: "Continue with Google" });
		const form = googleButton.closest("form");

		expect(form).not.toBeNull();
		expect(within(form as HTMLFormElement).getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
	});

	it("triggers Google OAuth from the in-card button", async () => {
		mockSignInWithOAuth.mockResolvedValue({ error: null });
		render(<SignupForm />);

		fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

		await waitFor(() => {
			expect(mockSignInWithOAuth).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: "google",
				}),
			);
		});
	});
});
