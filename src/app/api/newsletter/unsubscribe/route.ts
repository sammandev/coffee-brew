import { apiError, apiOk } from "@/lib/api";
import { getNewsletterProvider } from "@/lib/newsletter";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newsletterUnsubscribeSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const body = await request.json();
	const parsed = newsletterUnsubscribeSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const provider = getNewsletterProvider();
	const result = await provider.unsubscribe(parsed.data.email);

	const supabase = await createSupabaseServerClient();
	await supabase.from("newsletter_subscriptions").upsert(
		{
			email: parsed.data.email,
			consent: false,
			provider: "brevo",
			sync_status: result.ok ? "synced" : "queued",
			sync_error: result.ok ? null : (result.message ?? "Provider error"),
		},
		{ onConflict: "email" },
	);

	if (!result.ok) {
		return apiOk({ success: false, queued: true, message: result.message }, 202);
	}

	return apiOk({ success: true });
}
