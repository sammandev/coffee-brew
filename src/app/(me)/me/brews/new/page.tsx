import { requireRole } from "@/components/auth-guard";
import { BrewForm } from "@/components/forms/brew-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function MeCreateBrewPage() {
	await requireRole({ exactRole: "user", onUnauthorized: "forbidden" });
	const { locale } = await getServerI18n();

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Buat Racikan" : "Create Brew"}</h1>
			<p className="text-[var(--muted)]">
				{locale === "id"
					? "Catat semua parameter, lalu simpan sebagai draft atau publikasikan ke katalog."
					: "Capture every parameter, then save as draft or publish to catalog."}
			</p>
			<BrewForm mode="create" />
		</div>
	);
}
