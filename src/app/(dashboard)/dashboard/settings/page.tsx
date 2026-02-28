import { requireRole } from "@/components/auth-guard";
import { SiteSettingsForm } from "@/components/forms/site-settings-form";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";

export default async function DashboardSettingsPage() {
	await requireRole({ minRole: "superuser", onUnauthorized: "forbidden" });
	const [{ locale }, settings] = await Promise.all([getServerI18n(), getSiteSettings()]);

	return (
		<div className="space-y-6">
			<header>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">
					{locale === "id" ? "Pengaturan Aplikasi" : "Application Settings"}
				</h1>
				<p className="mt-2 text-[var(--muted)]">
					{locale === "id"
						? "Kelola nama aplikasi, title tab, ikon tab, konten navbar/footer, serta toggle metode login dan pendaftaran."
						: "Manage app name, tab title, tab icon, navbar/footer content, and login/registration toggles."}
				</p>
			</header>

			<SiteSettingsForm settings={settings} />
		</div>
	);
}
