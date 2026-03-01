import { requireRole } from "@/components/auth-guard";
import { SuperuserUserCreateModal } from "@/components/forms/superuser-user-create-modal";
import { UserDisplayNameEditor } from "@/components/forms/user-display-name-editor";
import { UserRoleControls } from "@/components/forms/user-role-controls";
import { UserStatusControls } from "@/components/forms/user-status-controls";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Role, UserStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function resolveUserStatus(status: unknown): UserStatus {
	if (status === "blocked" || status === "disabled" || status === "active") {
		return status;
	}
	return "active";
}

interface DashboardUsersPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

function buildUsersPageHref(page: number, q: string) {
	const params = new URLSearchParams();
	if (q.trim().length > 0) params.set("q", q.trim());
	params.set("page", String(page));
	const encoded = params.toString();
	return encoded.length > 0 ? `/dashboard/users?${encoded}` : "/dashboard/users";
}

export default async function DashboardUsersPage({ searchParams }: DashboardUsersPageProps) {
	const session = await requireRole({ minRole: "superuser", onUnauthorized: "forbidden" });
	const [{ locale }, params] = await Promise.all([getServerI18n(), searchParams]);
	const supabase = createSupabaseAdminClient();
	const q = firstParam(params.q).trim();
	const rawPage = Number(firstParam(params.page));
	const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
	const perPage = 50;
	const from = (page - 1) * perPage;
	const to = from + perPage - 1;

	let profileQuery = supabase
		.from("profiles")
		.select("id, email, display_name, status, created_at, is_verified", { count: "exact" })
		.order("created_at", { ascending: false })
		.range(from, to);

	if (q.length > 0) {
		const escaped = q.replace(/[,%_]/g, "").trim();
		profileQuery = profileQuery.or(`display_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
	}

	const { data: profiles, count: totalRows } = await profileQuery;
	const accountRows =
		(profiles ?? []).map((profile) => ({
			id: String(profile.id),
			email:
				typeof profile.email === "string" && profile.email.length > 0
					? profile.email
					: locale === "id"
						? "tanpa-email@example.com"
						: "missing-email@example.com",
			display_name:
				typeof profile.display_name === "string" && profile.display_name.trim().length > 0
					? profile.display_name.trim()
					: typeof profile.email === "string" && profile.email.length > 0
						? profile.email
						: locale === "id"
							? "tanpa-email@example.com"
							: "missing-email@example.com",
			status: resolveUserStatus(profile.status),
			is_verified: Boolean(profile.is_verified),
			created_at: String(profile.created_at ?? new Date().toISOString()),
		})) ?? [];

	const totalUsers = totalRows ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));
	const visiblePageStart = Math.max(1, page - 2);
	const visiblePageEnd = Math.min(totalPages, page + 2);

	const userIds = accountRows.map((user) => user.id);
	const { data: roleRows } =
		userIds.length > 0
			? await supabase.from("user_roles").select("user_id, roles(name)").in("user_id", userIds)
			: { data: [] as Array<{ user_id: string; roles: { name: string } | Array<{ name: string }> | null }> };

	const rolePriority = new Map([
		["superuser", 1],
		["admin", 2],
		["user", 3],
	]);
	const roleByUserId = new Map<string, string>();
	for (const row of roleRows ?? []) {
		const roleName = Array.isArray(row.roles) ? row.roles[0]?.name : row.roles?.name;
		if (!roleName) continue;
		const previous = roleByUserId.get(row.user_id);
		if (!previous) {
			roleByUserId.set(row.user_id, roleName);
			continue;
		}
		if ((rolePriority.get(roleName) ?? 99) < (rolePriority.get(previous) ?? 99)) {
			roleByUserId.set(row.user_id, roleName);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-heading text-4xl text-(--espresso)">
					{locale === "id" ? "Manajemen Pengguna" : "User Management"}
				</h1>
				<SuperuserUserCreateModal />
			</div>

			<form
				action="/dashboard/users"
				method="GET"
				className="flex flex-wrap items-center gap-2 rounded-2xl border bg-(--surface-elevated) p-3"
			>
				<input
					type="search"
					name="q"
					defaultValue={q}
					placeholder={locale === "id" ? "Cari nama atau email" : "Search name or email"}
					className="min-w-56 flex-1 rounded-xl border bg-(--surface) px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--accent)/30"
				/>
				<button
					type="submit"
					className="rounded-xl bg-(--espresso) px-4 py-2 text-sm font-semibold text-(--surface) transition hover:opacity-90"
				>
					{locale === "id" ? "Cari" : "Search"}
				</button>
				{q.length > 0 ? (
					<a
						href="/dashboard/users"
						className="rounded-xl border px-4 py-2 text-sm font-semibold text-(--muted) transition hover:bg-(--sand)/15"
					>
						{locale === "id" ? "Reset" : "Reset"}
					</a>
				) : null}
			</form>

			<div className="flex flex-wrap items-center justify-between gap-2 text-sm text-(--muted)">
				<span>
					{locale === "id" ? "Total pengguna" : "Total users"}:{" "}
					<span className="font-semibold text-(--espresso)">{totalUsers}</span>
				</span>
				<span>
					{locale === "id" ? "Halaman" : "Page"} {page} / {totalPages}
				</span>
			</div>

			<div className="space-y-3">
				{accountRows.length === 0 ? (
					<Card className="p-5 text-sm text-(--muted)">
						{q.length > 0
							? locale === "id"
								? "Tidak ada pengguna yang cocok dengan pencarian."
								: "No users matched the search query."
							: locale === "id"
								? "Belum ada pengguna."
								: "No users found."}
					</Card>
				) : null}
				{accountRows.map((user) => {
					const currentRole = (roleByUserId.get(user.id) as Role | undefined) ?? "user";

					return (
						<Card key={user.id} className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<div className="flex items-center gap-2">
									<span className="rounded-full border bg-(--surface) px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-(--muted)">
										{currentRole}
									</span>
									<UserDisplayNameEditor displayName={user.display_name ?? user.email} userId={user.id} />
								</div>
								<p className="text-xs text-(--muted)">{user.email}</p>
								<p className="text-xs text-(--muted)">
									{locale === "id" ? "Bergabung" : "Joined"} {formatDate(user.created_at, locale)}
								</p>
							</div>
							<div className="space-y-2">
								<UserRoleControls currentRole={currentRole} userId={user.id} />
								<UserStatusControls userId={user.id} status={user.status} isVerified={user.is_verified} />
								{user.id === session.userId ? (
									<p className="text-[11px] text-(--muted)">
										{locale === "id" ? "Akun Anda saat ini." : "This is your current account."}
									</p>
								) : null}
							</div>
						</Card>
					);
				})}
			</div>

			{totalPages > 1 ? (
				<div className="flex flex-wrap items-center justify-center gap-2">
					{page > 1 ? (
						<a
							href={buildUsersPageHref(page - 1, q)}
							className="rounded-full bg-(--surface-elevated) px-3.5 py-1.5 text-sm font-medium text-(--muted) transition hover:bg-(--sand)/20"
						>
							{locale === "id" ? "Sebelumnya" : "Previous"}
						</a>
					) : null}
					{Array.from({ length: visiblePageEnd - visiblePageStart + 1 }).map((_, offset) => {
						const targetPage = visiblePageStart + offset;
						return (
							<a
								key={`users-page-${targetPage}`}
								href={buildUsersPageHref(targetPage, q)}
								className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
									targetPage === page
										? "bg-(--espresso) text-(--surface)"
										: "bg-(--surface-elevated) text-(--muted) hover:bg-(--sand)/20"
								}`}
							>
								{targetPage}
							</a>
						);
					})}
					{page < totalPages ? (
						<a
							href={buildUsersPageHref(page + 1, q)}
							className="rounded-full bg-(--surface-elevated) px-3.5 py-1.5 text-sm font-medium text-(--muted) transition hover:bg-(--sand)/20"
						>
							{locale === "id" ? "Berikutnya" : "Next"}
						</a>
					) : null}
				</div>
			) : null}
		</div>
	);
}
