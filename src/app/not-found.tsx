import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotFound() {
	const { locale } = await getServerI18n();

	return (
		<div className="mx-auto max-w-2xl rounded-3xl border bg-(--surface-elevated) p-8 text-center">
			<h1 className="font-heading text-4xl text-(--espresso)">
				{locale === "id" ? "Halaman Tidak Ditemukan" : "Page Not Found"}
			</h1>
			<p className="mt-3 text-(--muted)">
				{locale === "id"
					? "Konten yang kamu cari tidak tersedia atau sedang disembunyikan."
					: "The content you are looking for does not exist or is hidden."}
			</p>
			<Link
				href="/"
				className="mt-5 inline-block rounded-full bg-(--espresso) px-5 py-2 text-sm font-semibold text-(--surface-elevated)"
			>
				{locale === "id" ? "Kembali ke Beranda" : "Go Home"}
			</Link>
		</div>
	);
}
