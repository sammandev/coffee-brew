import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PermissionAction, ResourceKey, Role } from "@/lib/types";

export function hasPermission(
	role: Role,
	resource: ResourceKey,
	action: PermissionAction,
	permissionMatrix?: Array<{ resource: ResourceKey; action: PermissionAction }>,
) {
	const source = permissionMatrix ?? DEFAULT_ROLE_PERMISSIONS[role] ?? [];
	return source.some((permission) => permission.resource === resource && permission.action === action);
}

export async function getRolePermissions(role: Role) {
	if (role === "superuser") {
		return DEFAULT_ROLE_PERMISSIONS.superuser;
	}

	const supabase = await createSupabaseServerClient();

	const { data: roleRow } = await supabase.from("roles").select("id").eq("name", role).maybeSingle();

	if (!roleRow) {
		return DEFAULT_ROLE_PERMISSIONS[role];
	}

	const { data: rolePermissions } = await supabase
		.from("role_permissions")
		.select("permission_id")
		.eq("role_id", roleRow.id);

	const permissionIds = (rolePermissions ?? []).map((entry) => entry.permission_id);
	if (permissionIds.length === 0) {
		return [];
	}

	const { data: permissions } = await supabase
		.from("permissions")
		.select("resource_key, action_key")
		.in("id", permissionIds);

	return (permissions ?? []).map((permission) => ({
		resource: permission.resource_key as ResourceKey,
		action: permission.action_key as PermissionAction,
	}));
}

export async function assertPermission(role: Role, resource: ResourceKey, action: PermissionAction) {
	if (role === "superuser") {
		return true;
	}

	const permissions = await getRolePermissions(role);
	const allowed = hasPermission(role, resource, action, permissions);
	if (!allowed) {
		throw new Error("FORBIDDEN");
	}
	return true;
}
