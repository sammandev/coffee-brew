import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
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
	const normalizedBody = (() => {
		if (!body || typeof body !== "object") return body;
		const payload = body as Record<string, unknown>;
		const content = typeof payload.content === "string" ? payload.content : "";
		return {
			...payload,
			content: sanitizeForStorage(content),
		};
	})();
	const parsed = forumCommentSchema.safeParse(normalizedBody);

	if (!parsed.success) {
		return apiError("Invalid comment payload", 400, parsed.error.message);
	}

	if (!validatePlainTextLength(parsed.data.content, { min: 1, max: 3000 })) {
		return apiError("Invalid comment payload", 400, "Comment must be between 1 and 3000 characters.");
	}

	const supabase = await createSupabaseServerClient();
	const parentCommentId: string | null = parsed.data.parentCommentId ?? null;

	if (parentCommentId) {
		const { data: parentComment, error: parentError } = await supabase
			.from("forum_comments")
			.select("id, thread_id, parent_comment_id")
			.eq("id", parentCommentId)
			.maybeSingle();

		if (parentError || !parentComment) {
			return apiError("Parent comment not found", 404, parentError?.message);
		}

		if (parentComment.thread_id !== id) {
			return apiError("Parent comment belongs to a different thread", 400);
		}

		let depth = 0;
		let cursor = parentComment.parent_comment_id as string | null;

		while (cursor) {
			depth += 1;
			if (depth >= 2) {
				return apiError("Replies are limited to 2 nested levels", 400);
			}

			const { data: ancestor, error: ancestorError } = await supabase
				.from("forum_comments")
				.select("id, parent_comment_id")
				.eq("id", cursor)
				.maybeSingle();

			if (ancestorError || !ancestor) {
				return apiError("Reply chain is invalid", 400, ancestorError?.message);
			}

			cursor = ancestor.parent_comment_id as string | null;
		}
	}

	const { data, error } = await supabase
		.from("forum_comments")
		.insert({
			thread_id: id,
			author_id: permission.context.userId,
			content: parsed.data.content,
			parent_comment_id: parentCommentId,
			status: "visible",
		})
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create comment", 400, error.message);
	}

	return apiOk({ comment: data }, 201);
}
