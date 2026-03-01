import { apiError, apiOk } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumSubforumSchema } from "@/lib/validators";

export async function GET(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const url = new URL(request.url);
	const categoryId = url.searchParams.get("categoryId");
	const supabase = await createSupabaseServerClient();
	let query = supabase
		.from("forum_subforums")
		.select(
			"id, category_id, slug, name_en, name_id, description_en, description_id, order_index, is_visible, created_at, updated_at",
		)
		.order("order_index", { ascending: true });
	if (categoryId) {
		query = query.eq("category_id", categoryId);
	}
	const { data, error } = await query;
	if (error) {
		return apiError("Could not load sub-forums", 400, error.message);
	}
	return apiOk({ subforums: data ?? [] });
}

export async function POST(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;
	const body = await request.json().catch(() => null);
	const parsed = forumSubforumSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid sub-forum payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_subforums")
		.insert({
			category_id: parsed.data.category_id,
			slug: parsed.data.slug,
			name_en: parsed.data.name_en,
			name_id: parsed.data.name_id,
			description_en: parsed.data.description_en ?? null,
			description_id: parsed.data.description_id ?? null,
			order_index: parsed.data.order_index,
			is_visible: parsed.data.is_visible,
		})
		.select("*")
		.single();
	if (error) {
		return apiError("Could not create sub-forum", 400, error.message);
	}
	revalidatePublicCache([CACHE_TAGS.FORUM]);
	return apiOk({ subforum: data }, 201);
}

export async function PUT(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;
	const body = await request.json().catch(() => null);
	const parsed = forumSubforumSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid sub-forum payload", 400, parsed.error.message);
	}
	if (!parsed.data.id) {
		return apiError("Invalid sub-forum payload", 400, "Sub-forum id is required.");
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_subforums")
		.update({
			category_id: parsed.data.category_id,
			slug: parsed.data.slug,
			name_en: parsed.data.name_en,
			name_id: parsed.data.name_id,
			description_en: parsed.data.description_en ?? null,
			description_id: parsed.data.description_id ?? null,
			order_index: parsed.data.order_index,
			is_visible: parsed.data.is_visible,
		})
		.eq("id", parsed.data.id)
		.select("*")
		.single();
	if (error) {
		return apiError("Could not update sub-forum", 400, error.message);
	}
	revalidatePublicCache([CACHE_TAGS.FORUM]);
	return apiOk({ subforum: data });
}

export async function DELETE(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const url = new URL(request.url);
	const id = url.searchParams.get("id");
	if (!id) {
		return apiError("Sub-forum id is required", 400);
	}

	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("forum_subforums").delete().eq("id", id);
	if (error) {
		return apiError("Could not delete sub-forum", 400, error.message);
	}
	revalidatePublicCache([CACHE_TAGS.FORUM]);
	return apiOk({ success: true });
}
