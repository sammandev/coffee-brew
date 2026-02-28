import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileDisplayNameSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	if (session.status !== "active") {
		return apiError("Account blocked or disabled", 403);
	}

	const body = await request.json().catch(() => null);
	const parsed = profileDisplayNameSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("profiles")
		.update({ display_name: parsed.data.display_name })
		.eq("id", session.userId)
		.select("display_name")
		.single();

	if (error) {
		return apiError("Could not update profile", 400, error.message);
	}

	return apiOk({ success: true, display_name: data.display_name });
}
