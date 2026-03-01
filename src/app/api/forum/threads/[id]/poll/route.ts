import { apiError, apiOk } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumPollCreateSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = forumPollCreateSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid poll payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data: thread } = await supabase
		.from("forum_threads")
		.select("id, author_id")
		.eq("id", id)
		.eq("status", "visible")
		.maybeSingle();
	if (!thread) {
		return apiError("Thread not found", 404);
	}

	if (
		thread.author_id !== permission.context.userId &&
		permission.context.role !== "admin" &&
		permission.context.role !== "superuser"
	) {
		return apiError("Forbidden", 403, "Only thread owner or moderator can create a poll.");
	}

	const options = Array.from(
		new Set(parsed.data.options.map((option) => option.trim()).filter((option) => option.length > 0)),
	);
	if (options.length < 2) {
		return apiError("Invalid poll payload", 400, "Poll requires at least 2 unique options.");
	}

	const { data, error } = await supabase
		.from("forum_polls")
		.insert({
			thread_id: id,
			question: parsed.data.question,
			options,
			closes_at: parsed.data.closesAt ?? null,
			created_by: permission.context.userId,
		})
		.select("id, thread_id, question, options, closes_at, created_by, created_at")
		.single();

	if (error) {
		return apiError("Could not create poll", 400, error.message);
	}

	revalidatePublicCache([CACHE_TAGS.FORUM]);

	return apiOk({ poll: data }, 201);
}
