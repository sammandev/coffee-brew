import { fireEvent, render, screen } from "@testing-library/react";
import { Select } from "@/components/ui/select";

describe("Select", () => {
	it("aligns menu to the end when configured", () => {
		const { container } = render(
			<Select id="role" name="role" defaultValue="en" menuAlign="end">
				<option value="en">EN</option>
				<option value="id">ID</option>
			</Select>,
		);

		fireEvent.click(screen.getByRole("button", { name: "EN" }));

		const popup = container.querySelector("div.right-0");
		expect(popup).not.toBeNull();
	});

	it("removes indicator spacing when showIndicator is false", () => {
		render(
			<Select id="locale" name="locale" defaultValue="en" showIndicator={false}>
				<option value="en">EN</option>
				<option value="id">ID</option>
			</Select>,
		);

		const trigger = screen.getByRole("button", { name: "EN" });
		expect(trigger).toHaveClass("justify-center");
		expect(trigger).toHaveClass("gap-0");
	});
});
