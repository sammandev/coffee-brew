import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/components/auth-guard";
import { BrewForm } from "@/components/forms/brew-form";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function DashboardEditBrewPage({ params }: { params: Promise<{ id: string }> }) {
	const [session, { id }, { locale }, supabase] = await Promise.all([
		requireRole({ minRole: "admin", onUnauthorized: "forbidden" }),
		params,
		getServerI18n(),
		createSupabaseServerClient(),
	]);

	const { data: brew } = await supabase.from("brews").select("*").eq("id", id).maybeSingle();
	if (!brew) {
		notFound();
	}

	const isOwner = brew.owner_id === session.userId;
	const isSuperuser = session.role === "superuser";
	const ownerRole = !isOwner ? await supabase.rpc("user_role", { user_id: brew.owner_id }) : { data: null };
	const canAdminModerate = session.role === "admin" && (ownerRole.data === "user" || ownerRole.data === "admin");

	if (isOwner || isSuperuser || canAdminModerate) {
		return (
			<div className="space-y-4">
				<h1 className="font-heading text-4xl text-(--espresso)">{locale === "id" ? "Ubah Brew" : "Edit Brew"}</h1>
				<p className="text-(--muted)">
					{locale === "id" ? "Anda dapat mengubah detail brew ini secara penuh." : "You can fully edit this brew details."}
				</p>
				<BrewForm mode="edit" brewId={id} initialValues={brew} redirectPath="/dashboard/brews" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h1 className="font-heading text-4xl text-(--espresso)">{locale === "id" ? "Moderasi Brew" : "Moderate Brew"}</h1>

			<Card className="space-y-3">
				<p className="text-sm text-(--muted)">
					{locale === "id"
						? "Brew milik superuser tidak dapat dimoderasi oleh admin."
						: "Brews owned by superusers cannot be moderated by admins."}
				</p>
				<p className="text-sm text-(--foreground)/90">
					<strong>{brew.name}</strong> · {brew.brew_method}
				</p>
				<p className="text-xs text-(--muted)">
					{locale === "id" ? "Diperbarui" : "Updated"}: {formatDate(brew.updated_at, locale)}
				</p>
			</Card>

			<Link href="/dashboard/brews" className="inline-flex rounded-full border px-4 py-2 text-sm font-semibold">
				{locale === "id" ? "Kembali ke Daftar Brew" : "Back to Brew List"}
			</Link>
		</div>
	);
}
