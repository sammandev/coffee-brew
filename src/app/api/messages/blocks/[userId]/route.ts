import { apiError, apiOk } from "@/lib/api";
import { requireActiveDmSession } from "@/lib/dm-service";

export async function POST(_: Request, { params }: { params: Promise<{ userId: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { userId } = await params;

	if (userId === context.userId) {
		return apiError("Invalid operation", 400, "Cannot block your own account.");
	}

	const { data: target } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
	if (!target) {
		return apiError("User not found", 404);
	}

	const { error } = await supabase.from("user_blocks").upsert(
		{
			blocker_id: context.userId,
			blocked_id: userId,
		},
		{ onConflict: "blocker_id,blocked_id" },
	);
	if (error) {
		return apiError("Could not block user", 400, error.message);
	}

	return apiOk({ success: true }, 201);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ userId: string }> }) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;
	const { userId } = await params;

	const { error } = await supabase
		.from("user_blocks")
		.delete()
		.eq("blocker_id", context.userId)
		.eq("blocked_id", userId);
	if (error) {
		return apiError("Could not unblock user", 400, error.message);
	}

	return apiOk({ success: true });
}
