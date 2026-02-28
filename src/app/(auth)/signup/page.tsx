import { SignupForm } from "@/components/forms/signup-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function SignupPage() {
	const { t } = await getServerI18n();

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{t("auth.signupTitle")}</h1>
			<p className="text-[var(--muted)]">{t("auth.signupDescription")}</p>
			<SignupForm />
		</div>
	);
}
