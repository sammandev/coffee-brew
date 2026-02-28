import { apiError, apiOk } from "@/lib/api";
import { requireManageUsersPermission, updateUserStatus } from "@/lib/user-lifecycle";
import { userActionSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const permission = await requireManageUsersPermission();
	if (permission.response) return permission.response;

	const body = await request.json();
	const parsed = userActionSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const result = await updateUserStatus({
		actorId: permission.session.userId,
		targetUserId: id,
		status: "disabled",
		reason: parsed.data.reason,
	});

	if (!result.ok) {
		return apiError("Could not disable user", 400, result.error);
	}

	return apiOk({ success: true });
}
