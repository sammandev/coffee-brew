import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profilePreferencesSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	if (session.status !== "active") {
		return apiError("Account blocked or disabled", 403);
	}

	const body = await request.json().catch(() => null);
	const parsed = profilePreferencesSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const patch: Record<string, string | boolean> = {};
	if (typeof parsed.data.display_name === "string") {
		patch.display_name = parsed.data.display_name;
	}
	if (typeof parsed.data.mention_handle === "string") {
		patch.mention_handle = parsed.data.mention_handle.toLowerCase();
	}
	if (typeof parsed.data.is_profile_private === "boolean") {
		patch.is_profile_private = parsed.data.is_profile_private;
	}
	if (typeof parsed.data.show_online_status === "boolean") {
		patch.show_online_status = parsed.data.show_online_status;
	}
	if (typeof parsed.data.dm_privacy === "string") {
		patch.dm_privacy = parsed.data.dm_privacy;
	}

	if (Object.keys(patch).length === 0) {
		return apiError("No fields to update", 400);
	}

	const supabase = await createSupabaseServerClient();
	if (typeof patch.mention_handle === "string") {
		const { data: existingHandle } = await supabase
			.from("profiles")
			.select("id")
			.eq("mention_handle", patch.mention_handle)
			.neq("id", session.userId)
			.maybeSingle();
		if (existingHandle) {
			return apiError("Could not update profile", 400, "Mention handle is already in use.");
		}
	}
	const { data, error } = await supabase
		.from("profiles")
		.update(patch)
		.eq("id", session.userId)
		.select("display_name, mention_handle, is_profile_private, show_online_status, dm_privacy")
		.single();

	if (error) {
		return apiError("Could not update profile", 400, error.message);
	}

	return apiOk({
		success: true,
		display_name: data.display_name,
		mention_handle: data.mention_handle,
		is_profile_private: data.is_profile_private,
		show_online_status: data.show_online_status,
		dm_privacy: data.dm_privacy,
	});
}
