import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const USER_A = {
	email: "pw.dm.a.20260301234129@example.com",
	password: "Str0ngPass!123",
};

const USER_B = {
	email: "pw.dm.b.20260301234129@example.com",
	password: "Str0ngPass!123",
	id: "d7d92a38-ef27-49e1-85e6-ee5339a34eaf",
};

async function login(page: Page, email: string, password: string, next: string) {
	await page.goto(`/login?next=${encodeURIComponent(next)}`);
	await page.locator("#login-email").fill(email);
	await page.locator("#password").fill(password);
	await page.locator("form button[type='submit']").first().click();
}

async function sampleVisibilityCount(page: Page, pattern: RegExp, durationMs: number, intervalMs: number) {
	const locator = page.getByText(pattern).first();
	const startedAt = Date.now();
	let totalSamples = 0;
	let visibleSamples = 0;

	while (Date.now() - startedAt < durationMs) {
		totalSamples += 1;
		if (await locator.isVisible().catch(() => false)) {
			visibleSamples += 1;
		}
		await page.waitForTimeout(intervalMs);
	}

	return {
		totalSamples,
		visibleSamples,
		ratio: totalSamples > 0 ? visibleSamples / totalSamples : 0,
	};
}

test("messages page focused flicker scenario", async ({ browser }) => {
	test.setTimeout(120_000);

	const contextA = await browser.newContext();
	const contextB = await browser.newContext();
	const pageA = await contextA.newPage();
	const pageB = await contextB.newPage();

	await login(pageA, USER_A.email, USER_A.password, `/users/${USER_B.id}`);
	await expect(pageA).toHaveURL(new RegExp(`/users/${USER_B.id}`));

	await pageA.getByRole("button", { name: /^Message$/ }).click();
	await expect(pageA).toHaveURL(/\/messages\?c=/);

	const conversationId = new URL(pageA.url()).searchParams.get("c");
	expect(conversationId).toBeTruthy();
	if (!conversationId) {
		throw new Error("Conversation id was not created.");
	}

	await login(pageB, USER_B.email, USER_B.password, `/messages?c=${conversationId}`);
	await expect(pageB).toHaveURL(/\/messages\?c=/);

	const threadTitleA = pageA.getByText(/PW DM B 20260301234129/i).first();
	await expect(threadTitleA).toBeVisible();

	const editorB = pageB.locator(".ProseMirror").first();
	await editorB.click();
	await editorB.type("typing indicator warmup", { delay: 18 });
	await expect(pageA.getByText(/typing|sedang mengetik/i)).toBeVisible({ timeout: 8_000 });

	const loadingPattern = /Loading messages|Memuat pesan|Loading conversations|Memuat percakapan/i;
	const flickerSampling = sampleVisibilityCount(pageA, loadingPattern, 5_000, 100);

	await pageB.evaluate(async (targetConversationId) => {
		for (let index = 0; index < 12; index += 1) {
			await fetch(`/api/messages/conversations/${targetConversationId}/messages`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ body_html: `<p>rapid-${index}-${Date.now()}</p>` }),
			});
			await new Promise((resolve) => setTimeout(resolve, 55));
		}
	}, conversationId);

	const loadingSamplesDuringBurst = await flickerSampling;

	const searchInput = pageA.getByRole("textbox").first();
	await searchInput.click();
	await searchInput.fill("pw dm b");
	await pageA.waitForTimeout(120);
	await searchInput.fill("pw dm");
	await pageA.waitForTimeout(120);
	await searchInput.fill("pw");
	await pageA.waitForTimeout(120);
	await searchInput.fill("");

	await expect(threadTitleA).toBeVisible();
	const loadingSamplesDuringSearch = await sampleVisibilityCount(pageA, loadingPattern, 2_500, 100);

	const lastIncoming = pageA.getByText(/rapid-11-/i).first();
	await expect(lastIncoming).toBeVisible({ timeout: 10_000 });

	console.log(
		JSON.stringify(
			{
				metric: "messages-flicker",
				conversationId,
				loadingSamplesDuringBurst,
				loadingSamplesDuringSearch,
			},
			null,
			2,
		),
	);

	await contextA.close();
	await contextB.close();
});
