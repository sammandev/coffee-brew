import { requireRole } from "@/components/auth-guard";
import { ProfileSettingsPanel } from "@/components/forms/profile-settings-panel";
import { ForumBreadcrumbs } from "@/components/forum/forum-breadcrumbs";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MeProfilePage() {
	const [session, { locale }, settings] = await Promise.all([
		requireRole({ exactRole: "user", onUnauthorized: "forbidden" }),
		getServerI18n(),
		getSiteSettings(),
	]);
	const supabase = await createSupabaseServerClient();

	const [{ data: profile }, { data: newsletter }] = await Promise.all([
		supabase
			.from("profiles")
			.select("display_name, avatar_url, status, is_profile_private, show_online_status, dm_privacy")
			.eq("id", session.userId)
			.maybeSingle(),
		supabase.from("newsletter_subscriptions").select("consent").eq("email", session.email).maybeSingle(),
	]);

	const displayName = profile?.display_name?.trim() || session.email.split("@")[0] || "User";

	return (
		<div className="space-y-5">
			<ForumBreadcrumbs
				items={[
					{ href: "/", label: locale === "id" ? "Beranda" : "Home" },
					{ href: "/me", label: locale === "id" ? "Dashboard Saya" : "My Dashboard" },
					{ label: locale === "id" ? "Profil" : "Profile" },
				]}
			/>
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Profil" : "Profile"}</h1>
			<ProfileSettingsPanel
				avatarUrl={profile?.avatar_url ?? null}
				displayName={displayName}
				email={session.email}
				accountRole={session.role}
				labels={{
					displayName: locale === "id" ? "Nama Tampilan" : "Display Name",
					email: "Email",
					status: locale === "id" ? "Status" : "Status",
				}}
				enableGoogleLogin={settings.enable_google_login}
				publicProfileHref={`/users/${session.userId}`}
				showOnlineStatus={profile?.show_online_status ?? true}
				isProfilePrivate={profile?.is_profile_private ?? false}
				dmPrivacy={profile?.dm_privacy ?? "everyone"}
				status={profile?.status ?? session.status}
				newsletterSubscribed={newsletter?.consent ?? false}
			/>
		</div>
	);
}
