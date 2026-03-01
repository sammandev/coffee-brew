import Link from "next/link";
import { AuthDiagnostics } from "@/components/auth/auth-diagnostics";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { LoginForm } from "@/components/forms/login-form";
import { getServerI18n } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const [{ locale, t }, settings, params] = await Promise.all([getServerI18n(), getSiteSettings(), searchParams]);
	const nextPath = firstParam(params.next).trim();
	const redirectPath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : undefined;
	const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? null;
	const oneTapClientIdDetected = Boolean(googleClientId?.trim());

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-(--espresso)">{t("auth.welcomeBack")}</h1>
			<p className="text-(--muted)">{t("auth.loginDescription")}</p>
			<LoginForm
				redirectPath={redirectPath}
				enableGoogleLogin={settings.enable_google_login}
				enableMagicLinkLogin={settings.enable_magic_link_login}
			/>
			<GoogleOneTap
				enabled={settings.enable_google_login}
				redirectPath={redirectPath}
				googleClientId={googleClientId}
				showVerification
				locale={locale}
			/>
			{process.env.NODE_ENV === "development" ? (
				<AuthDiagnostics oneTapClientIdDetected={oneTapClientIdDetected} redirectPath={redirectPath} />
			) : null}
			<div className="rounded-3xl border bg-(--surface-elevated) p-5 text-sm text-(--muted)">
				<p>
					{t("auth.noAccountYet")}{" "}
					{settings.enable_signup ? (
						<Link href="/signup" className="font-semibold text-(--accent) underline">
							{t("auth.goToSignup")}
						</Link>
					) : (
						<span className="font-semibold text-foreground">
							{locale === "id" ? "Pendaftaran saat ini dinonaktifkan." : "Sign up is currently disabled."}
						</span>
					)}
				</p>
			</div>
		</div>
	);
}
