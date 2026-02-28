import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumCommentSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("forum_comments")
		.select("*")
		.eq("thread_id", id)
		.eq("status", "visible")
		.order("created_at", { ascending: true });

	if (error) {
		return apiError("Could not load comments", 400, error.message);
	}

	return apiOk({ comments: data });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const body = await request.json();
	const parsed = forumCommentSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid comment payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("forum_comments")
		.insert({
			thread_id: id,
			author_id: permission.context.userId,
			content: parsed.data.content,
			status: "visible",
		})
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create comment", 400, error.message);
	}

	return apiOk({ comment: data }, 201);
}
