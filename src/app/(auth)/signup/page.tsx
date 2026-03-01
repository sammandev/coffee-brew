import Link from "next/link";
import { AuthDiagnostics } from "@/components/auth/auth-diagnostics";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { SignupForm } from "@/components/forms/signup-form";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";

export default async function SignupPage() {
	const [{ locale, t }, settings] = await Promise.all([getServerI18n(), getSiteSettings()]);
	const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? null;
	const oneTapClientIdDetected = Boolean(googleClientId?.trim());

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-(--espresso)">{t("auth.signupTitle")}</h1>
			<p className="text-(--muted)">{t("auth.signupDescription")}</p>
			{settings.enable_signup ? (
				<SignupForm enableGoogleLogin={settings.enable_google_login} />
			) : (
				<div className="rounded-3xl border bg-(--surface-elevated) p-6 text-sm text-(--muted)">
					{locale === "id"
						? "Pendaftaran akun baru sedang dinonaktifkan oleh administrator."
						: "New account registration is currently disabled by the administrator."}
				</div>
			)}
			<GoogleOneTap
				enabled={settings.enable_google_login}
				googleClientId={googleClientId}
				showVerification
				locale={locale}
			/>
			{process.env.NODE_ENV === "development" ? <AuthDiagnostics oneTapClientIdDetected={oneTapClientIdDetected} /> : null}
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
