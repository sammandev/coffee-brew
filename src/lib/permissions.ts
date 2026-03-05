import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/constants";
import { ForbiddenError } from "@/lib/errors";
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

	// Single query: join roles → role_permissions → permissions in one round-trip.
	const { data: roleRow } = await supabase
		.from("roles")
		.select("id, role_permissions(permission_id, permissions(resource_key, action_key))")
		.eq("name", role)
		.maybeSingle();

	if (!roleRow) {
		return DEFAULT_ROLE_PERMISSIONS[role];
	}

	type PermissionJoin = {
		permission_id: string;
		permissions: Array<{ resource_key: string; action_key: string }> | null;
	};

	const entries = (roleRow.role_permissions as unknown as PermissionJoin[]) ?? [];
	if (entries.length === 0) {
		return [];
	}

	return entries
		.flatMap((entry) => entry.permissions ?? [])
		.map((perm) => ({
			resource: perm.resource_key as ResourceKey,
			action: perm.action_key as PermissionAction,
		}));
}

export async function assertPermission(role: Role, resource: ResourceKey, action: PermissionAction) {
	if (role === "superuser") {
		return true;
	}

	const permissions = await getRolePermissions(role);
	const allowed = hasPermission(role, resource, action, permissions);
	if (!allowed) {
		throw new ForbiddenError();
	}
	return true;
}
