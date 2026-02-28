import { StatusPage } from "@/components/errors/status-page";
import { getServerI18n } from "@/lib/i18n/server";

export default async function InternalErrorStatusRoute() {
	const { locale } = await getServerI18n();

	return (
		<StatusPage
			code={500}
			title={locale === "id" ? "Terjadi Kesalahan Server" : "Internal Server Error"}
			description={
				locale === "id"
					? "Terjadi kendala internal. Silakan coba beberapa saat lagi."
					: "Something went wrong on our side. Please try again in a moment."
			}
			illustrationPath="/errors/500.svg"
			primaryActionHref="/"
			primaryActionLabel={locale === "id" ? "Kembali ke Beranda" : "Back to Home"}
			secondaryActionHref="/dashboard"
			secondaryActionLabel={locale === "id" ? "Ke Dashboard" : "Go to Dashboard"}
		/>
	);
}
