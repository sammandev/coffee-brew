import { StatusPage } from "@/components/errors/status-page";
import { getServerI18n } from "@/lib/i18n/server";

export default async function UnauthorizedPage() {
	const { locale } = await getServerI18n();

	return (
		<StatusPage
			code={401}
			title={locale === "id" ? "Harus Masuk Terlebih Dahulu" : "Authentication Required"}
			description={
				locale === "id"
					? "Silakan masuk terlebih dahulu untuk membuka halaman ini."
					: "Please sign in first to access this page."
			}
			illustrationPath="/errors/401.svg"
			primaryActionHref="/login"
			primaryActionLabel={locale === "id" ? "Masuk" : "Sign In"}
			secondaryActionHref="/signup"
			secondaryActionLabel={locale === "id" ? "Daftar" : "Create Account"}
		/>
	);
}
