import { LoginForm } from "@/components/forms/login-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function LoginPage() {
	const { t } = await getServerI18n();

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("auth.welcomeBack")}</h1>
			<p className="text-[var(--muted)]">{t("auth.loginDescription")}</p>
			<LoginForm />
		</div>
	);
}
