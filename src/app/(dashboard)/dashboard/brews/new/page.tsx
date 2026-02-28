import { requireRole } from "@/components/auth-guard";
import { BrewForm } from "@/components/forms/brew-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function DashboardCreateBrewPage() {
	await requireRole({ minRole: "admin", onUnauthorized: "forbidden" });
	const { locale } = await getServerI18n();

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Buat Brew" : "Create Brew"}</h1>
			<p className="text-[var(--muted)]">
				{locale === "id"
					? "Admin dan superuser dapat membuat brew mereka sendiri untuk katalog."
					: "Admins and superusers can create their own brews for the catalog."}
			</p>
			<BrewForm mode="create" redirectPath="/dashboard/brews" />
		</div>
	);
}
