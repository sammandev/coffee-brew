import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const pinSchema = z.object({
	pinned: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = pinSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid pin payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_threads")
		.update({ is_pinned: parsed.data.pinned })
		.eq("id", id)
		.select("id, is_pinned, updated_at")
		.single();
	if (error) {
		return apiError("Could not update thread pin", 400, error.message);
	}

	return apiOk({ thread: data });
}
