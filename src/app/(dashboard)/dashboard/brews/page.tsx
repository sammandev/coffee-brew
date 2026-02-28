import Link from "next/link";
import { requireRole } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

interface OwnerProfile {
	id: string;
	display_name: string | null;
	email: string | null;
}

function resolveOwnerLabel(profile: OwnerProfile | null) {
	if (!profile) return "Unknown user";
	return profile.display_name?.trim() || profile.email || "Unknown user";
}

export default async function DashboardBrewsPage() {
	const [session, { locale }, supabase] = await Promise.all([
		requireRole({ minRole: "admin", onUnauthorized: "forbidden" }),
		getServerI18n(),
		createSupabaseServerClient(),
	]);

	const { data: brews } = await supabase
		.from("brews")
		.select("id, owner_id, name, status, brew_method, brewer_name, updated_at")
		.order("updated_at", { ascending: false })
		.limit(120);

	const ownerIds = Array.from(new Set((brews ?? []).map((brew) => brew.owner_id)));
	const { data: owners } =
		ownerIds.length > 0
			? await supabase.from("profiles").select("id, display_name, email").in("id", ownerIds)
			: { data: [] as OwnerProfile[] };
	const ownerMap = new Map((owners ?? []).map((owner) => [owner.id, owner as OwnerProfile]));

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<Badge>{locale === "id" ? "Manajemen Brew" : "Brew Management"}</Badge>
					<h1 className="mt-2 font-heading text-4xl text-[var(--espresso)]">
						{locale === "id" ? "Operasional Brew" : "Brew Operations"}
					</h1>
					<p className="mt-1 text-sm text-[var(--muted)]">
						{locale === "id"
							? "Kelola brew milik sendiri dan moderasi visibilitas brew pengguna lain."
							: "Manage your own brews and moderate visibility for other users."}
					</p>
				</div>
				<Link
					href="/dashboard/brews/new"
					className="rounded-full bg-[var(--espresso)] px-4 py-2 text-sm font-semibold text-[var(--surface-elevated)]"
				>
					{locale === "id" ? "Buat Brew" : "Create Brew"}
				</Link>
			</header>

			<div className="overflow-x-auto rounded-3xl border bg-[var(--surface-elevated)]">
				<table className="w-full min-w-220 text-sm">
					<thead>
						<tr className="border-b bg-[var(--surface)] text-left">
							<th className="px-4 py-3">{locale === "id" ? "Nama" : "Name"}</th>
							<th className="px-4 py-3">{locale === "id" ? "Metode" : "Method"}</th>
							<th className="px-4 py-3">{locale === "id" ? "Pemilik" : "Owner"}</th>
							<th className="px-4 py-3">{locale === "id" ? "Status" : "Status"}</th>
							<th className="px-4 py-3">{locale === "id" ? "Diperbarui" : "Updated"}</th>
							<th className="px-4 py-3">{locale === "id" ? "Aksi" : "Actions"}</th>
						</tr>
					</thead>
					<tbody>
						{(brews ?? []).map((brew) => {
							const owner = ownerMap.get(brew.owner_id) ?? null;
							const isOwner = brew.owner_id === session.userId;
							const canFullEdit = isOwner || session.role === "superuser";

							return (
								<tr key={brew.id} className="border-b align-top">
									<td className="px-4 py-3">
										<p className="font-semibold text-[var(--espresso)]">{brew.name}</p>
										<p className="text-xs text-[var(--muted)]">{brew.brewer_name}</p>
									</td>
									<td className="px-4 py-3">{brew.brew_method}</td>
									<td className="px-4 py-3">{resolveOwnerLabel(owner)}</td>
									<td className="px-4 py-3">{brew.status}</td>
									<td className="px-4 py-3">{formatDate(brew.updated_at, locale)}</td>
									<td className="px-4 py-3">
										<Link
											href={`/dashboard/brews/${brew.id}/edit`}
											className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-[var(--sand)]/20"
										>
											{canFullEdit ? (locale === "id" ? "Ubah" : "Edit") : locale === "id" ? "Moderasi" : "Moderate"}
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{(brews ?? []).length === 0 ? (
				<Card>
					<p className="text-sm text-[var(--muted)]">
						{locale === "id" ? "Belum ada brew untuk dikelola." : "No brews available yet."}
					</p>
				</Card>
			) : null}
		</div>
	);
}
