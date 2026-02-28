import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const moveSchema = z.object({
	subforumId: z.string().uuid(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = moveSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid move payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data: subforum } = await supabase
		.from("forum_subforums")
		.select("id")
		.eq("id", parsed.data.subforumId)
		.maybeSingle();
	if (!subforum) {
		return apiError("Sub-forum not found", 404);
	}

	const { data, error } = await supabase
		.from("forum_threads")
		.update({ subforum_id: parsed.data.subforumId })
		.eq("id", id)
		.select("id, subforum_id, updated_at")
		.single();
	if (error) {
		return apiError("Could not move thread", 400, error.message);
	}

	return apiOk({ thread: data });
}
