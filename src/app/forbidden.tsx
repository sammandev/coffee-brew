import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ForbiddenPage() {
	const { locale } = await getServerI18n();

	return (
		<div className="mx-auto grid min-h-[60vh] w-full max-w-2xl place-items-center px-4 py-12">
			<div className="w-full rounded-3xl border bg-[var(--surface-elevated)] p-8 text-center">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">403</p>
				<h1 className="mt-2 font-heading text-4xl text-[var(--espresso)]">
					{locale === "id" ? "Akses Ditolak" : "Access Forbidden"}
				</h1>
				<p className="mt-3 text-[var(--muted)]">
					{locale === "id"
						? "Role akun ini tidak memiliki izin untuk membuka halaman yang diminta."
						: "Your account role does not have permission to access this page."}
				</p>
				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					<Link href="/" className="rounded-full border px-4 py-2 text-sm font-semibold">
						{locale === "id" ? "Kembali ke Beranda" : "Back to Home"}
					</Link>
					<Link
						href="/session/resolve"
						className="rounded-full bg-[var(--espresso)] px-4 py-2 text-sm font-semibold text-[var(--surface-elevated)]"
					>
						{locale === "id" ? "Buka Dashboard Saya" : "Open My Dashboard"}
					</Link>
				</div>
			</div>
		</div>
	);
}
