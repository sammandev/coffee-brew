import { BrevoProvider } from "@/lib/newsletter/brevo";
import type { NewsletterProvider } from "@/lib/newsletter/provider";

export function getNewsletterProvider(): NewsletterProvider {
	return new BrevoProvider();
}
