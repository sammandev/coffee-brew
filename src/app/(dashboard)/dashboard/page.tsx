import Link from "next/link";
import { requireRole } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardOverviewPage() {
	const [session, { locale, t }, supabase] = await Promise.all([
		requireRole({ minRole: "admin", onUnauthorized: "forbidden" }),
		getServerI18n(),
		createSupabaseServerClient(),
	]);

	const [{ count: brewCount }, { count: threadCount }, { count: blogCount }] = await Promise.all([
		supabase.from("brews").select("*", { count: "exact", head: true }),
		supabase.from("forum_threads").select("*", { count: "exact", head: true }),
		supabase.from("blog_posts").select("*", { count: "exact", head: true }),
	]);

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border bg-[var(--surface-elevated)] p-6 sm:p-8">
				<Badge>{session.role === "superuser" ? t("nav.superuser") : t("nav.admin")}</Badge>
				<h2 className="mt-3 font-heading text-4xl text-[var(--espresso)]">
					{locale === "id" ? "Pusat Operasi" : "Operations Center"}
				</h2>
				<p className="mt-2 max-w-3xl text-[var(--muted)]">
					{locale === "id"
						? "Akses cepat ke landing CMS, FAQ, moderasi, dan manajemen blog untuk operasional harian."
						: "Quick access to landing CMS, FAQ, moderation, and blog management for daily operations."}
				</p>
			</section>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardTitle>{locale === "id" ? "Total Racikan" : "Total Brews"}</CardTitle>
					<p className="mt-2 text-3xl font-bold text-[var(--espresso)]">{(brewCount ?? 0).toLocaleString("en-US")}</p>
				</Card>
				<Card>
					<CardTitle>{locale === "id" ? "Total Thread" : "Total Threads"}</CardTitle>
					<p className="mt-2 text-3xl font-bold text-[var(--espresso)]">{(threadCount ?? 0).toLocaleString("en-US")}</p>
				</Card>
				<Card>
					<CardTitle>{locale === "id" ? "Total Blog" : "Total Blog Posts"}</CardTitle>
					<p className="mt-2 text-3xl font-bold text-[var(--espresso)]">{(blogCount ?? 0).toLocaleString("en-US")}</p>
				</Card>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<Link
					href="/dashboard/brews"
					className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
				>
					<h3 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Brew" : "Brews"}</h3>
					<CardDescription className="mt-2">
						{locale === "id"
							? "Kelola dan moderasi brew. Admin tidak dapat memoderasi brew milik superuser."
							: "Manage and moderate brews. Admin cannot moderate superuser-owned brews."}
					</CardDescription>
				</Link>
				<Link
					href="/dashboard/collections"
					className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
				>
					<h3 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Koleksi" : "Collections"}</h3>
					<CardDescription className="mt-2">
						{locale === "id"
							? "Kelola wishlist, riwayat seduh, dan URL share publik."
							: "Manage wishlist, brewed history, and public share URL."}
					</CardDescription>
				</Link>
				<Link
					href="/dashboard/landing"
					className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
				>
					<h3 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Landing" : "Landing"}</h3>
					<CardDescription className="mt-2">
						{locale === "id" ? "Kelola section dan urutan konten landing." : "Manage landing sections and content order."}
					</CardDescription>
				</Link>
				<Link
					href="/dashboard/faq"
					className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
				>
					<h3 className="font-heading text-2xl text-[var(--espresso)]">FAQ</h3>
					<CardDescription className="mt-2">
						{locale === "id" ? "Kelola FAQ bilingual dan visibilitas item." : "Manage bilingual FAQ and item visibility."}
					</CardDescription>
				</Link>
				<Link
					href="/dashboard/moderation"
					className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
				>
					<h3 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Moderasi" : "Moderation"}</h3>
					<CardDescription className="mt-2">
						{locale === "id" ? "Hide/unhide konten komunitas." : "Hide/unhide community content."}
					</CardDescription>
				</Link>
				<Link
					href="/dashboard/blog"
					className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
				>
					<h3 className="font-heading text-2xl text-[var(--espresso)]">Blog CMS</h3>
					<CardDescription className="mt-2">
						{locale === "id" ? "Kelola konten blog dan publikasi." : "Manage blog content and publishing."}
					</CardDescription>
				</Link>
				{session.role === "superuser" ? (
					<>
						<Link
							href="/dashboard/rbac"
							className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
						>
							<h3 className="font-heading text-2xl text-[var(--espresso)]">RBAC</h3>
							<CardDescription className="mt-2">
								{locale === "id" ? "Kelola permission matrix per role." : "Manage role permission matrix."}
							</CardDescription>
						</Link>
						<Link
							href="/dashboard/users"
							className="rounded-3xl border bg-[var(--surface-elevated)] p-6 hover:bg-[var(--surface)]"
						>
							<h3 className="font-heading text-2xl text-[var(--espresso)]">{locale === "id" ? "Pengguna" : "Users"}</h3>
							<CardDescription className="mt-2">
								{locale === "id"
									? "Kelola pengguna: tambah, ubah peran, disable, verifikasi, dan hapus."
									: "Manage users: create, update role, disable, verify, and delete."}
							</CardDescription>
						</Link>
					</>
				) : null}
			</div>
		</div>
	);
}
