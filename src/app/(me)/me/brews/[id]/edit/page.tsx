import { notFound } from "next/navigation";
import { requireRole } from "@/components/auth-guard";
import { BrewForm } from "@/components/forms/brew-form";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MeEditBrewPage({ params }: { params: Promise<{ id: string }> }) {
	const [session, { id }, { locale }] = await Promise.all([
		requireRole({ exactRole: "user", onUnauthorized: "forbidden" }),
		params,
		getServerI18n(),
	]);

	const supabase = await createSupabaseServerClient();
	const { data: brew } = await supabase
		.from("brews")
		.select("*")
		.eq("id", id)
		.eq("owner_id", session.userId)
		.maybeSingle();

	if (!brew) {
		notFound();
	}

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">{locale === "id" ? "Ubah Racikan" : "Edit Brew"}</h1>
			<Card className="bg-[var(--surface)]">
				<p className="text-sm text-[var(--muted)]">
					{locale === "id"
						? "Hanya pemilik yang dapat mengubah atau menghapus racikan ini."
						: "Only the owner can update or delete this brew."}
				</p>
			</Card>
			<BrewForm mode="edit" brewId={id} initialValues={brew} />
		</div>
	);
}
