import Link from "next/link";
import { SignupForm } from "@/components/forms/signup-form";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";

export default async function SignupPage() {
	const [{ locale, t }, settings] = await Promise.all([getServerI18n(), getSiteSettings()]);

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("auth.signupTitle")}</h1>
			<p className="text-[var(--muted)]">{t("auth.signupDescription")}</p>
			{settings.enable_signup ? (
				<SignupForm enableGoogleLogin={settings.enable_google_login} />
			) : (
				<div className="rounded-3xl border bg-(--surface-elevated) p-6 text-sm text-(--muted)">
					{locale === "id"
						? "Pendaftaran akun baru sedang dinonaktifkan oleh administrator."
						: "New account registration is currently disabled by the administrator."}
				</div>
			)}
			<div className="rounded-3xl border bg-(--surface-elevated) p-5 text-sm text-(--muted)">
				<p>
					{t("auth.alreadyHaveAccount")}{" "}
					<Link href="/login" className="font-semibold text-(--accent) underline">
						{t("auth.goToLogin")}
					</Link>
				</p>
			</div>
		</div>
	);
}
