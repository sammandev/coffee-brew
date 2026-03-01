import { requireRole } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	const [session, { locale }, settings, supabase] = await Promise.all([
		requireRole({ minRole: "admin", onUnauthorized: "forbidden" }),
		getServerI18n(),
		getSiteSettings(),
		createSupabaseServerClient(),
	]);

	const { data: profile } = await supabase
		.from("profiles")
		.select("display_name, avatar_url")
		.eq("id", session.userId)
		.maybeSingle<{ avatar_url: string | null; display_name: string | null }>();

	const displayName = profile?.display_name?.trim() || session.email.split("@")[0] || "User";

	return (
		<DashboardShell
			appName={settings.app_name}
			avatarUrl={profile?.avatar_url ?? null}
			displayName={displayName}
			email={session.email}
			locale={locale}
			role={session.role}
			title={locale === "id" ? "Dashboard Operasional" : "Operations Dashboard"}
			userId={session.userId}
		>
			{children}
		</DashboardShell>
	);
}
