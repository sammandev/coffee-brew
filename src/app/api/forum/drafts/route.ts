import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumDraftSchema } from "@/lib/validators";

export async function GET(request: Request) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const url = new URL(request.url);
	const draftType = url.searchParams.get("type");
	if (draftType !== "thread" && draftType !== "comment") {
		return apiError("Invalid draft type", 400);
	}

	const threadId = url.searchParams.get("threadId");
	const subforumId = url.searchParams.get("subforumId");
	const supabase = await createSupabaseServerClient();
	let query = supabase
		.from("forum_drafts")
		.select("id, draft_type, thread_id, subforum_id, payload, updated_at")
		.eq("user_id", session.userId)
		.eq("draft_type", draftType);

	if (draftType === "thread" && subforumId) {
		query = query.eq("subforum_id", subforumId);
	}
	if (draftType === "comment" && threadId) {
		query = query.eq("thread_id", threadId);
	}

	const { data, error } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
	if (error) {
		return apiError("Could not load draft", 400, error.message);
	}

	return apiOk({ draft: data ?? null });
}

export async function PUT(request: Request) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const body = await request.json().catch(() => null);
	const parsed = forumDraftSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid draft payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data: existing } = await supabase
		.from("forum_drafts")
		.select("id")
		.eq("user_id", session.userId)
		.eq("draft_type", parsed.data.draftType)
		.eq("thread_id", parsed.data.threadId ?? null)
		.eq("subforum_id", parsed.data.subforumId ?? null)
		.order("updated_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (existing) {
		const { data, error } = await supabase
			.from("forum_drafts")
			.update({ payload: parsed.data.payload })
			.eq("id", existing.id)
			.select("id, draft_type, thread_id, subforum_id, payload, updated_at")
			.single();
		if (error) {
			return apiError("Could not save draft", 400, error.message);
		}
		return apiOk({ draft: data });
	}

	const { data, error } = await supabase
		.from("forum_drafts")
		.insert({
			user_id: session.userId,
			draft_type: parsed.data.draftType,
			thread_id: parsed.data.threadId ?? null,
			subforum_id: parsed.data.subforumId ?? null,
			payload: parsed.data.payload,
		})
		.select("id, draft_type, thread_id, subforum_id, payload, updated_at")
		.single();
	if (error) {
		return apiError("Could not save draft", 400, error.message);
	}

	return apiOk({ draft: data }, 201);
}
