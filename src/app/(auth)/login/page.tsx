import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";

export default async function LoginPage() {
	const [{ locale, t }, settings] = await Promise.all([getServerI18n(), getSiteSettings()]);

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("auth.welcomeBack")}</h1>
			<p className="text-[var(--muted)]">{t("auth.loginDescription")}</p>
			<LoginForm
				enableGoogleLogin={settings.enable_google_login}
				enableMagicLinkLogin={settings.enable_magic_link_login}
			/>
			<div className="rounded-3xl border bg-(--surface-elevated) p-5 text-sm text-(--muted)">
				<p>
					{t("auth.noAccountYet")}{" "}
					{settings.enable_signup ? (
						<Link href="/signup" className="font-semibold text-(--accent) underline">
							{t("auth.goToSignup")}
						</Link>
					) : (
						<span className="font-semibold text-(--foreground)">
							{locale === "id" ? "Pendaftaran saat ini dinonaktifkan." : "Sign up is currently disabled."}
						</span>
					)}
				</p>
			</div>
		</div>
	);
}
