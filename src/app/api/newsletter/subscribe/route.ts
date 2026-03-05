import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { getNewsletterProvider } from "@/lib/newsletter";
import { consumeDbRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { newsletterSubscribeSchema } from "@/lib/validators";

export const runtime = "edge";

export async function POST(request: Request) {
	const ip = getRequestIp(request.headers);
	const rateLimit = await consumeDbRateLimit({
		key: `newsletter:subscribe:${ip}`,
		limit: 5,
		windowMs: 60 * 60 * 1000, // 5 attempts per IP per hour
	});
	if (!rateLimit.allowed) {
		return apiError("Too many requests", 429, `Try again in ${rateLimit.retryAfterSeconds} seconds.`);
	}

	const body = await request.json().catch(() => null);
	const parsed = newsletterSubscribeSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const provider = getNewsletterProvider();
	const result = await provider
		.subscribe({
			email: parsed.data.email,
			source: parsed.data.source,
		})
		.catch((error: unknown) => ({
			ok: false,
			message: error instanceof Error ? error.message : "Newsletter provider failure",
			providerId: null,
		}));

	const supabase = createSupabaseAdminClient();
	const session = await getSessionContext();

	const { error: upsertError } = await supabase.from("newsletter_subscriptions").upsert(
		{
			user_id: session?.userId ?? null,
			email: parsed.data.email,
			consent: true,
			source: parsed.data.source,
			provider: provider.name,
			provider_subscriber_id: result.providerId ?? null,
			sync_status: result.ok ? "synced" : "queued",
			sync_error: result.ok ? null : (result.message ?? "Provider error"),
		},
		{ onConflict: "email" },
	);

	if (upsertError) {
		console.error("[newsletter] Failed to persist subscription:", upsertError.message);
		return apiOk(
			{
				success: false,
				queued: true,
				message: "Newsletter subscription queued.",
			},
			202,
		);
	}

	if (!result.ok) {
		return apiOk({ success: false, queued: true, message: result.message }, 202);
	}

	return apiOk({ success: true, subscriberId: result.providerId }, 201);
}
