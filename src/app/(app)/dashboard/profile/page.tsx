import { requireRole } from "@/components/auth-guard";
import { ProfileNewsletterForm } from "@/components/forms/profile-newsletter-form";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
	const [session, { locale }] = await Promise.all([requireRole(), getServerI18n()]);
	const supabase = await createSupabaseServerClient();

	const [{ data: profile }, { data: newsletter }] = await Promise.all([
		supabase.from("profiles").select("display_name, status, created_at").eq("id", session.userId).maybeSingle(),
		supabase.from("newsletter_subscriptions").select("consent").eq("email", session.email).maybeSingle(),
	]);

	return (
		<div className="space-y-5">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Profil" : "Profile"}</h1>
			<Card>
				<p className="text-sm text-[var(--muted)]">
					{locale === "id" ? "Nama Tampilan" : "Display Name"}: {profile?.display_name ?? "N/A"}
				</p>
				<p className="text-sm text-[var(--muted)]">Email: {session.email}</p>
				<p className="text-sm text-[var(--muted)]">Status: {profile?.status ?? session.status}</p>
			</Card>
			<ProfileNewsletterForm email={session.email} subscribed={newsletter?.consent ?? false} />
		</div>
	);
}
