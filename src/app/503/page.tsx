import { StatusPage } from "@/components/errors/status-page";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ServiceUnavailablePage() {
	const { locale } = await getServerI18n();

	return (
		<StatusPage
			code={503}
			title={locale === "id" ? "Layanan Sedang Maintenance" : "Service Temporarily Unavailable"}
			description={
				locale === "id"
					? "Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi setelah maintenance selesai."
					: "We are performing scheduled maintenance. Please check back again shortly."
			}
			illustrationPath="/errors/503.svg"
			primaryActionHref="/"
			primaryActionLabel={locale === "id" ? "Coba Lagi" : "Try Again"}
			secondaryActionHref="/sitemap"
			secondaryActionLabel={locale === "id" ? "Lihat Halaman Lain" : "Browse Sitemap"}
		/>
	);
}
