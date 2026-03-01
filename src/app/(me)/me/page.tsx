import Link from "next/link";
import { requireRole } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function MePage() {
	const [session, { locale, t }, supabase] = await Promise.all([
		requireRole({ exactRole: "user", onUnauthorized: "forbidden" }),
		getServerI18n(),
		createSupabaseServerClient(),
	]);

	const { data: brews } = await supabase
		.from("brews")
		.select("id, name, status, brew_method, updated_at")
		.eq("owner_id", session.userId)
		.order("updated_at", { ascending: false })
		.limit(20);

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<Badge>{t("nav.dashboard")}</Badge>
					<h1 className="mt-2 font-heading text-4xl text-(--espresso)">{t("dashboard.title")}</h1>
				</div>
				<div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
					<Link href="/me/collections" className="rounded-full border px-4 py-2 text-center text-sm font-semibold">
						{locale === "id" ? "Koleksi" : "Collections"}
					</Link>
					<Link href="/me/profile" className="rounded-full border px-4 py-2 text-center text-sm font-semibold">
						{t("dashboard.profile")}
					</Link>
					<Link
						href="/me/brews/new"
						className="rounded-full bg-(--espresso) px-4 py-2 text-center text-sm font-semibold text-(--surface-elevated)"
					>
						{t("dashboard.newBrew")}
					</Link>
				</div>
			</header>

			{brews?.length ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{brews.map((brew) => (
						<Card key={brew.id}>
							<CardTitle>{brew.name}</CardTitle>
							<CardDescription className="mt-1">{brew.brew_method}</CardDescription>
							<p className="mt-3 text-sm text-(--muted)">Status: {brew.status}</p>
							<p className="text-xs text-(--muted)">
								{locale === "id" ? "Diperbarui" : "Updated"} {formatDate(brew.updated_at, locale)}
							</p>
							<Link
								href={`/me/brews/${brew.id}/edit`}
								className="mt-4 inline-block text-sm font-semibold text-(--accent) underline"
							>
								{locale === "id" ? "Ubah Racikan" : "Edit Brew"}
							</Link>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<CardTitle>{locale === "id" ? "Belum ada racikan" : "No brews yet"}</CardTitle>
					<CardDescription className="mt-2">
						{locale === "id"
							? "Buat resep pertamamu untuk mengisi dashboard."
							: "Create your first recipe to populate your dashboard."}
					</CardDescription>
				</Card>
			)}
		</div>
	);
}
