import { apiError, apiOk } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";
import { requireSessionContext } from "@/lib/auth";
import { assertPermission } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rbacUpdateSchema } from "@/lib/validators";

export async function GET() {
	const session = await requireSessionContext().catch(() => null);
	if (!session) return apiError("Unauthorized", 401);

	try {
		await assertPermission(session.role, "rbac", "manage_permissions");
	} catch {
		return apiError("Forbidden", 403);
	}

	const supabase = await createSupabaseServerClient();

	const [{ data: roles }, { data: permissions }, { data: rolePermissions }] = await Promise.all([
		supabase.from("roles").select("id, name"),
		supabase.from("permissions").select("id, resource_key, action_key"),
		supabase.from("role_permissions").select("role_id, permission_id"),
	]);

	return apiOk({ roles, permissions, rolePermissions });
}

export async function PUT(request: Request) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) return apiError("Unauthorized", 401);

	try {
		await assertPermission(session.role, "rbac", "manage_permissions");
	} catch {
		return apiError("Forbidden", 403);
	}

	const body = await request.json();
	const parsed = rbacUpdateSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();

	const [{ data: role }, { data: permissionRows }] = await Promise.all([
		supabase.from("roles").select("id, name").eq("name", parsed.data.role).single(),
		supabase.from("permissions").select("id, resource_key, action_key"),
	]);

	if (!role) {
		return apiError("Role not found", 404);
	}

	const lookup = new Map(
		(permissionRows ?? []).map((permission) => [`${permission.resource_key}:${permission.action_key}`, permission.id]),
	);

	const permissionIds = parsed.data.permissions
		.map((permission) => lookup.get(`${permission.resource}:${permission.action}`))
		.filter((id): id is string => Boolean(id));

	await supabase.from("role_permissions").delete().eq("role_id", role.id);

	if (permissionIds.length > 0) {
		const { error } = await supabase.from("role_permissions").insert(
			permissionIds.map((permissionId) => ({
				role_id: role.id,
				permission_id: permissionId,
			})),
		);

		if (error) {
			return apiError("Could not update role permissions", 400, error.message);
		}
	}

	await logAuditEvent({
		actorId: session.userId,
		action: "rbac.update",
		targetType: "role",
		targetId: role.id,
		metadata: {
			role: parsed.data.role,
			permissionCount: permissionIds.length,
		},
	});

	return apiOk({ success: true, role: parsed.data.role, permissionCount: permissionIds.length });
}
