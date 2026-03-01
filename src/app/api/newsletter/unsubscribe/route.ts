import { apiError, apiOk } from "@/lib/api";
import { getNewsletterProvider } from "@/lib/newsletter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { newsletterUnsubscribeSchema } from "@/lib/validators";

export const runtime = "edge";

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const parsed = newsletterUnsubscribeSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const provider = getNewsletterProvider();
	const result = await provider.unsubscribe(parsed.data.email).catch((error: unknown) => ({
		ok: false,
		message: error instanceof Error ? error.message : "Newsletter provider failure",
		providerId: null,
	}));

	const supabase = createSupabaseAdminClient();
	const { error: upsertError } = await supabase.from("newsletter_subscriptions").upsert(
		{
			email: parsed.data.email,
			consent: false,
			provider: "brevo",
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
				message: `Newsletter unsubscribe queued (${upsertError.message})`,
			},
			202,
		);
	}

	if (!result.ok) {
		return apiOk({ success: false, queued: true, message: result.message }, 202);
	}

	return apiOk({ success: true });
}
