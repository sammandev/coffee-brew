import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { getNewsletterProvider } from "@/lib/newsletter";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newsletterSubscribeSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const body = await request.json();
	const parsed = newsletterSubscribeSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const provider = getNewsletterProvider();
	const result = await provider.subscribe({
		email: parsed.data.email,
		source: parsed.data.source,
	});

	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();

	await supabase.from("newsletter_subscriptions").upsert(
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

	if (!result.ok) {
		return apiOk({ success: false, queued: true, message: result.message }, 202);
	}

	return apiOk({ success: true, subscriberId: result.providerId }, 201);
}
