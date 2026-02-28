import { StatusPage } from "@/components/errors/status-page";
import { getServerI18n } from "@/lib/i18n/server";

export default async function UnauthorizedStatusRoute() {
	const { locale } = await getServerI18n();

	return (
		<StatusPage
			code={401}
			title={locale === "id" ? "Harus Masuk Terlebih Dahulu" : "Authentication Required"}
			description={
				locale === "id"
					? "Anda belum terautentikasi untuk mengakses resource ini."
					: "You are not authenticated to access this resource."
			}
			illustrationPath="/errors/401.svg"
			primaryActionHref="/login"
			primaryActionLabel={locale === "id" ? "Masuk" : "Sign In"}
			secondaryActionHref="/"
			secondaryActionLabel={locale === "id" ? "Ke Beranda" : "Go Home"}
		/>
	);
}
