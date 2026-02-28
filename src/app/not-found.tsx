import { StatusPage } from "@/components/errors/status-page";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotFound() {
	const { locale } = await getServerI18n();

	return (
		<StatusPage
			code={404}
			title={locale === "id" ? "Halaman Tidak Ditemukan" : "Page Not Found"}
			description={
				locale === "id"
					? "Konten yang kamu cari tidak tersedia atau sedang disembunyikan."
					: "The content you are looking for does not exist or is hidden."
			}
			illustrationPath="/errors/404.svg"
			primaryActionHref="/"
			primaryActionLabel={locale === "id" ? "Kembali ke Beranda" : "Go Home"}
			secondaryActionHref="/sitemap"
			secondaryActionLabel={locale === "id" ? "Lihat Peta Situs" : "View Sitemap"}
		/>
	);
}
