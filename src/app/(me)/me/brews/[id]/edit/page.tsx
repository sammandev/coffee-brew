import { notFound } from "next/navigation";
import { requireRole } from "@/components/auth-guard";
import { BrewForm } from "@/components/forms/brew-form";
import { ForumBreadcrumbs } from "@/components/forum/forum-breadcrumbs";
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
			<ForumBreadcrumbs
				items={[
					{ href: "/", label: locale === "id" ? "Beranda" : "Home" },
					{ href: "/me", label: locale === "id" ? "Dashboard Saya" : "My Dashboard" },
					{ label: locale === "id" ? "Ubah Racikan" : "Edit Brew" },
					{ label: brew.name },
				]}
			/>
			<h1 className="font-heading text-4xl text-(--espresso)">{locale === "id" ? "Ubah Racikan" : "Edit Brew"}</h1>
			<BrewForm mode="edit" brewId={id} initialValues={brew} />
		</div>
	);
}
