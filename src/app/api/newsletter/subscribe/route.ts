import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { getNewsletterProvider } from "@/lib/newsletter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { newsletterSubscribeSchema } from "@/lib/validators";

export async function POST(request: Request) {
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
			provider: "brevo",
			provider_subscriber_id: result.providerId ?? null,
			sync_status: result.ok ? "synced" : "queued",
			sync_error: result.ok ? null : (result.message ?? "Provider error"),
		},
		{ onConflict: "email" },
	);

	if (upsertError) {
		return apiOk(
			{
				success: false,
				queued: true,
				message: `Newsletter subscription queued (${upsertError.message})`,
			},
			202,
		);
	}

	if (!result.ok) {
		return apiOk({ success: false, queued: true, message: result.message }, 202);
	}

	return apiOk({ success: true, subscriberId: result.providerId }, 201);
}
