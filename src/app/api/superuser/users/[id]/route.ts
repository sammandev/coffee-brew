import { apiError, apiOk } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteUserLifecycle, requireManageUsersPermission } from "@/lib/user-lifecycle";
import { profileDisplayNameSchema, userActionSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const permission = await requireManageUsersPermission();
	if (permission.response) return permission.response;

	const body = await request.json().catch(() => null);
	const parsed = profileDisplayNameSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("profiles").update({ display_name: parsed.data.display_name }).eq("id", id);
	if (error) {
		return apiError("Could not update display name", 400, error.message);
	}

	return apiOk({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const permission = await requireManageUsersPermission();
	if (permission.response) return permission.response;

	const body = await request.json().catch(() => ({}));
	const parsed = userActionSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const result = await deleteUserLifecycle({
		actorId: permission.session.userId,
		targetUserId: id,
		reason: parsed.data.reason,
	});

	if (!result.ok) {
		return apiError("Could not delete user", 400, result.error);
	}

	return apiOk({ success: true });
}
