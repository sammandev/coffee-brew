import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { superuserCreateUserSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}
	if (session.role !== "superuser") {
		return apiError("Forbidden", 403);
	}

	const body = await request.json().catch(() => null);
	const parsed = superuserCreateUserSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const admin = createSupabaseAdminClient();
	const email = parsed.data.email.trim().toLowerCase();
	const displayName = parsed.data.displayName?.trim() || null;

	const { data: createResult, error: createError } = await admin.auth.admin.createUser({
		email,
		password: parsed.data.password,
		email_confirm: parsed.data.emailConfirmed,
		user_metadata: {
			display_name: displayName,
		},
	});

	if (createError || !createResult.user) {
		return apiError("Could not create user", 400, createError?.message ?? "Unknown auth error");
	}

	const { error: profileError } = await admin.from("profiles").upsert(
		{
			id: createResult.user.id,
			email,
			display_name: displayName,
			status: "active",
		},
		{ onConflict: "id" },
	);

	if (profileError) {
		return apiError("Could not create profile", 400, profileError.message);
	}

	const { error: roleError } = await admin.rpc("promote_user_to_role", {
		target_email: email,
		target_role: parsed.data.role,
	});

	if (roleError) {
		return apiError("Could not assign role", 400, roleError.message);
	}

	return apiOk(
		{
			user: {
				id: createResult.user.id,
				email,
				display_name: displayName,
				role: parsed.data.role,
			},
		},
		201,
	);
}
