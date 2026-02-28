import { StatusPage } from "@/components/errors/status-page";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ForbiddenStatusRoute() {
	const { locale } = await getServerI18n();

	return (
		<StatusPage
			code={403}
			title={locale === "id" ? "Akses Ditolak" : "Access Forbidden"}
			description={
				locale === "id"
					? "Role akun ini tidak memiliki izin untuk membuka halaman yang diminta."
					: "Your account role does not have permission to access this page."
			}
			illustrationPath="/errors/403.svg"
			primaryActionHref="/session/resolve"
			primaryActionLabel={locale === "id" ? "Buka Dashboard Saya" : "Open My Dashboard"}
			secondaryActionHref="/"
			secondaryActionLabel={locale === "id" ? "Kembali ke Beranda" : "Back to Home"}
		/>
	);
}
