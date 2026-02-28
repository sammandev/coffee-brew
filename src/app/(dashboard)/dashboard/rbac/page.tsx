import { requireRole } from "@/components/auth-guard";
import { RbacMatrixEditor } from "@/components/forms/rbac-matrix-editor";
import { Card } from "@/components/ui/card";
import { ROLES } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export default async function DashboardRbacPage() {
	await requireRole({ minRole: "superuser", onUnauthorized: "forbidden" });
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);

	const [{ data: roles }, { data: permissions }, { data: rolePermissions }] = await Promise.all([
		supabase.from("roles").select("id, name"),
		supabase.from("permissions").select("id, resource_key, action_key"),
		supabase.from("role_permissions").select("role_id, permission_id"),
	]);

	const roleIdByName = new Map((roles ?? []).map((role) => [role.name as Role, role.id]));
	const permissionById = new Map(
		(permissions ?? []).map((permission) => [
			permission.id,
			{ resource: permission.resource_key, action: permission.action_key },
		]),
	);

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">
				{locale === "id" ? "Editor Matriks RBAC" : "RBAC Matrix Editor"}
			</h1>
			<Card>
				<p className="text-sm text-[var(--muted)]">
					{locale === "id"
						? "Superuser dapat menentukan aksi yang bisa dilakukan setiap role."
						: "Superusers can define which page actions each role can perform."}
				</p>
			</Card>

			<div className="space-y-5">
				{ROLES.map((role) => {
					const roleId = roleIdByName.get(role);
					const activePermissions = (rolePermissions ?? [])
						.filter((row) => row.role_id === roleId)
						.map((row) => permissionById.get(row.permission_id))
						.filter((item): item is { resource: string; action: string } => Boolean(item));

					return <RbacMatrixEditor key={role} role={role} activePermissions={activePermissions} />;
				})}
			</div>
		</div>
	);
}
