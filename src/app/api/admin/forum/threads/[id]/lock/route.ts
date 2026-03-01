import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const lockSchema = z.object({
	locked: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = lockSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid lock payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_threads")
		.update({ is_locked: parsed.data.locked })
		.eq("id", id)
		.select("id, is_locked, updated_at")
		.single();
	if (error) {
		return apiError("Could not update thread lock", 400, error.message);
	}

	revalidatePublicCache([CACHE_TAGS.FORUM]);

	return apiOk({ thread: data });
}
