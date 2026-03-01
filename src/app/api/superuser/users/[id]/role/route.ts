import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { superuserUpdateUserRoleSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}
	if (session.role !== "superuser") {
		return apiError("Forbidden", 403);
	}

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = superuserUpdateUserRoleSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const admin = createSupabaseAdminClient();

	const [{ data: profile }, { data: currentRole, error: roleLookupError }] = await Promise.all([
		admin.from("profiles").select("id, email").eq("id", id).maybeSingle<{ id: string; email: string | null }>(),
		admin.rpc("user_role", { user_id: id }),
	]);

	if (roleLookupError) {
		return apiError("Could not resolve user role", 400, roleLookupError.message);
	}
	if (currentRole !== "user" && currentRole !== "admin" && currentRole !== "superuser") {
		return apiError("User not found", 404);
	}

	if (currentRole === "superuser") {
		return apiError("Forbidden", 403, "Cannot update role for superuser account.");
	}

	const nextRole = parsed.data.role;
	if (currentRole === nextRole) {
		return apiOk({ success: true, role: currentRole });
	}

	let targetEmail = profile?.email?.trim().toLowerCase() ?? "";
	if (!targetEmail) {
		const { data: authUserResult, error: authLookupError } = await admin.auth.admin.getUserById(id);
		if (authLookupError || !authUserResult.user?.email) {
			return apiError("Could not resolve user email", 400, authLookupError?.message ?? "Missing auth email.");
		}
		targetEmail = authUserResult.user.email.toLowerCase();
	}

	const { error: updateRoleError } = await admin.rpc("promote_user_to_role", {
		target_email: targetEmail,
		target_role: nextRole,
	});

	if (updateRoleError) {
		return apiError("Could not update role", 400, updateRoleError.message);
	}

	return apiOk({ success: true, role: nextRole });
}
