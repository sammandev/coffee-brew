import { serverEnv } from "@/lib/config/server";
import type { NewsletterProvider, NewsletterResult, SubscribePayload } from "@/lib/newsletter/provider";

interface BrevoErrorPayload {
	code?: string;
	message?: string;
}

const DEFAULT_BREVO_BASE_URL = "https://api.brevo.com/v3";

function resolveBaseUrl() {
	const baseUrl = serverEnv.BREVO_BASE_URL || DEFAULT_BREVO_BASE_URL;
	return baseUrl.replace(/\/+$/, "");
}

function parseListIds() {
	const rawListIds = serverEnv.BREVO_LIST_IDS ?? serverEnv.BREVO_LIST_ID;

	if (!rawListIds) {
		return [];
	}

	const uniqueListIds = new Set(
		rawListIds
			.split(",")
			.map((value) => Number(value.trim()))
			.filter((value) => Number.isInteger(value) && value > 0),
	);

	return Array.from(uniqueListIds);
}

function normalizeErrorMessage(message: string | undefined, status: number) {
	if (!message || message.trim().length === 0) {
		return `Brevo request failed (${status})`;
	}

	return message.length > 220 ? message.slice(0, 220) : message;
}

function isDuplicateContactError(status: number, payload: BrevoErrorPayload) {
	const message = payload.message?.toLowerCase() ?? "";
	const code = payload.code?.toLowerCase() ?? "";

	return status === 400 && (code === "duplicate_parameter" || message.includes("already exist"));
}

async function readErrorPayload(response: Response): Promise<BrevoErrorPayload> {
	const contentType = response.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		const payload = (await response.json()) as BrevoErrorPayload;
		return payload;
	}

	return {
		message: await response.text(),
	};
}

export class BrevoProvider implements NewsletterProvider {
	private headers() {
		if (!serverEnv.BREVO_API_KEY) {
			throw new Error("BREVO_API_KEY is missing");
		}

		return {
			"api-key": serverEnv.BREVO_API_KEY,
			"Content-Type": "application/json",
		};
	}

	async subscribe(payload: SubscribePayload): Promise<NewsletterResult> {
		const listIds = parseListIds();
		if (listIds.length === 0) {
			return {
				ok: false,
				message: "BREVO_LIST_IDS is missing or invalid",
			};
		}

		try {
			const createContactResponse = await fetch(`${resolveBaseUrl()}/contacts`, {
				method: "POST",
				headers: this.headers(),
				body: JSON.stringify({
					email: payload.email,
					listIds,
					updateEnabled: false,
					attributes: {
						SOURCE: payload.source,
					},
				}),
				cache: "no-store",
			});

			if (createContactResponse.ok) {
				const body = (await createContactResponse.json()) as { id?: number };
				return {
					ok: true,
					providerId: body.id ? String(body.id) : payload.email,
				};
			}

			const createError = await readErrorPayload(createContactResponse);
			if (isDuplicateContactError(createContactResponse.status, createError)) {
				const updateResponse = await fetch(`${resolveBaseUrl()}/contacts/${encodeURIComponent(payload.email)}`, {
					method: "PUT",
					headers: this.headers(),
					body: JSON.stringify({
						listIds,
						emailBlacklisted: false,
					}),
					cache: "no-store",
				});

				if (updateResponse.ok) {
					return {
						ok: true,
						providerId: payload.email,
					};
				}

				const updateError = await readErrorPayload(updateResponse);
				return {
					ok: false,
					message: normalizeErrorMessage(updateError.message, updateResponse.status),
				};
			}

			return {
				ok: false,
				message: normalizeErrorMessage(createError.message, createContactResponse.status),
			};
		} catch (error) {
			return {
				ok: false,
				message: error instanceof Error ? error.message : "Brevo subscribe request failed",
			};
		}
	}

	async unsubscribe(email: string): Promise<NewsletterResult> {
		try {
			const response = await fetch(`${resolveBaseUrl()}/contacts/${encodeURIComponent(email)}`, {
				method: "PUT",
				headers: this.headers(),
				body: JSON.stringify({
					emailBlacklisted: true,
				}),
				cache: "no-store",
			});

			if (!response.ok) {
				const errorPayload = await readErrorPayload(response);
				return {
					ok: false,
					message: normalizeErrorMessage(errorPayload.message, response.status),
				};
			}

			return {
				ok: true,
				providerId: email,
			};
		} catch (error) {
			return {
				ok: false,
				message: error instanceof Error ? error.message : "Brevo unsubscribe request failed",
			};
		}
	}
}
