import { requireRole } from "@/components/auth-guard";
import { SuperuserUserCreateModal } from "@/components/forms/superuser-user-create-modal";
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

export default async function DashboardUsersPage() {
	const session = await requireRole({ minRole: "superuser", onUnauthorized: "forbidden" });
	const { locale } = await getServerI18n();
	const supabase = createSupabaseAdminClient();

	const { data: authUsersResult } = await supabase.auth.admin.listUsers({
		page: 1,
		perPage: 1000,
	});
	const authUsers = authUsersResult?.users ?? [];
	const authUserIds = authUsers.map((user) => user.id);

	const { data: profiles } =
		authUserIds.length > 0
			? await supabase
					.from("profiles")
					.select("id, email, display_name, status, created_at, is_verified")
					.in("id", authUserIds)
			: { data: [] as Array<Record<string, unknown>> };

	const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
	const accountRows = authUsers.map((authUser) => {
		const profile = profileMap.get(authUser.id) ?? null;
		const profileRecord = (profile ?? {}) as Record<string, unknown>;
		const metadataDisplayName =
			typeof authUser.user_metadata?.display_name === "string" ? authUser.user_metadata.display_name : null;
		const email =
			(typeof profileRecord.email === "string" && profileRecord.email) ||
			authUser.email ||
			(locale === "id" ? "tanpa-email@example.com" : "missing-email@example.com");
		const displayName =
			(typeof profileRecord.display_name === "string" && profileRecord.display_name.trim()) ||
			metadataDisplayName ||
			email;
		const createdAt =
			(typeof profileRecord.created_at === "string" && profileRecord.created_at) ||
			authUser.created_at ||
			new Date().toISOString();

		return {
			id: authUser.id,
			email,
			display_name: displayName,
			status: resolveUserStatus(profileRecord.status),
			is_verified: Boolean(profileRecord.is_verified),
			created_at: createdAt,
		};
	});

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
			<div className="space-y-3">
				{accountRows.map((user) => {
					const currentRole = (roleByUserId.get(user.id) as Role | undefined) ?? "user";

					return (
						<Card key={user.id} className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<div className="flex items-center gap-2">
									<span className="rounded-full border bg-(--surface) px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-(--muted)">
										{currentRole}
									</span>
									<p className="font-semibold text-(--espresso)">{user.display_name ?? user.email}</p>
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
		</div>
	);
}
