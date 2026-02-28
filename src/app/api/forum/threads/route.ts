import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumThreadSchema } from "@/lib/validators";

export async function GET() {
	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("forum_threads")
		.select("id, title, content, author_id, created_at, updated_at")
		.eq("status", "visible")
		.order("updated_at", { ascending: false })
		.limit(100);

	if (error) {
		return apiError("Could not load forum threads", 400, error.message);
	}

	return apiOk({ threads: data });
}

export async function POST(request: Request) {
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const body = await request.json();
	const parsed = forumThreadSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid thread payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("forum_threads")
		.insert({
			author_id: permission.context.userId,
			title: parsed.data.title,
			content: parsed.data.content,
			status: "visible",
		})
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create thread", 400, error.message);
	}

	return apiOk({ thread: data }, 201);
}
