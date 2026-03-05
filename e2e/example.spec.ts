import { expect, test } from "@playwright/test";

test("public home page renders", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole("link", { name: /catalog|katalog/i })).toBeVisible();
	await expect(page.getByRole("link", { name: /forum/i })).toBeVisible();
});

test("catalog page renders", async ({ page }) => {
	await page.goto("/catalog");

	await expect(page).toHaveURL(/\/catalog/);
	await expect(page.getByRole("heading", { name: /catalog|katalog/i })).toBeVisible();
});

test("forum page renders", async ({ page }) => {
	await page.goto("/forum");

	await expect(page).toHaveURL(/\/forum/);
	await expect(page.getByRole("heading", { name: /forum/i })).toBeVisible();
});
