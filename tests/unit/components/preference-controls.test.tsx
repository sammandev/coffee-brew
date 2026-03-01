import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { PreferenceControls } from "@/components/layout/preference-controls";

const mockSetLocale = vi.fn();
const mockSetThemePreference = vi.fn();

vi.mock("@/components/providers/app-preferences-provider", () => ({
	useAppPreferences: () => ({
		locale: "en",
		setLocale: mockSetLocale,
		themePreference: "light",
		setThemePreference: mockSetThemePreference,
		t: (key: string) => {
			const labels: Record<string, string> = {
				"prefs.language": "Language",
				"prefs.lang.en": "English",
				"prefs.lang.id": "Bahasa Indonesia",
				"prefs.theme": "Theme",
				"prefs.theme.light": "Light",
				"prefs.theme.dark": "Dark",
			};
			return labels[key] ?? key;
		},
	}),
}));

describe("PreferenceControls", () => {
	beforeEach(() => {
		mockSetLocale.mockClear();
		mockSetThemePreference.mockClear();
	});

	it("changes locale using language selector", () => {
		render(<PreferenceControls />);
		const selector = screen.getByLabelText("Language");
		fireEvent.click(selector);
		fireEvent.click(screen.getByRole("option", { name: "ID" }));
		expect(mockSetLocale).toHaveBeenCalledWith("id");
	});

	it("toggles theme via single click button", () => {
		render(<PreferenceControls />);
		const button = screen.getByRole("button", { name: /Theme/i });
		fireEvent.click(button);
		expect(mockSetThemePreference).toHaveBeenCalledWith("dark");
	});

	it("creates unique locale select ids across multiple instances", () => {
		const { container } = render(
			<>
				<PreferenceControls />
				<PreferenceControls />
			</>,
		);

		const localeSelects = Array.from(container.querySelectorAll("button[aria-haspopup='listbox']"));
		const ids = localeSelects.map((element) => element.id);
		const uniqueIds = new Set(ids);

		expect(localeSelects).toHaveLength(2);
		expect(uniqueIds.size).toBe(2);
	});
});
