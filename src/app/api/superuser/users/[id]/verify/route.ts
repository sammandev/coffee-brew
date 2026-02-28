import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireManageUsersPermission } from "@/lib/user-lifecycle";

const verifySchema = z.object({
	verified: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requireManageUsersPermission();
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = verifySchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("profiles")
		.update({
			is_verified: parsed.data.verified,
			verified_at: parsed.data.verified ? new Date().toISOString() : null,
		})
		.eq("id", id)
		.select("id, is_verified, verified_at")
		.single();
	if (error) {
		return apiError("Could not update verification", 400, error.message);
	}

	return apiOk({ profile: data });
}
