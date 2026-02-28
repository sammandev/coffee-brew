import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forumCategorySchema } from "@/lib/validators";

export async function GET() {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_categories")
		.select("id, slug, name_en, name_id, description_en, description_id, order_index, is_visible, created_at, updated_at")
		.order("order_index", { ascending: true });
	if (error) {
		return apiError("Could not load forum categories", 400, error.message);
	}
	return apiOk({ categories: data ?? [] });
}

export async function POST(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;
	const body = await request.json().catch(() => null);
	const parsed = forumCategorySchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid category payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_categories")
		.insert({
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
		return apiError("Could not create category", 400, error.message);
	}
	return apiOk({ category: data }, 201);
}

export async function PUT(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;
	const body = await request.json().catch(() => null);
	const parsed = forumCategorySchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid category payload", 400, parsed.error.message);
	}
	if (!parsed.data.id) {
		return apiError("Invalid category payload", 400, "Category id is required.");
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("forum_categories")
		.update({
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
		return apiError("Could not update category", 400, error.message);
	}
	return apiOk({ category: data });
}

export async function DELETE(request: Request) {
	const permission = await requirePermission("forum", "moderate");
	if (permission.response) return permission.response;

	const url = new URL(request.url);
	const id = url.searchParams.get("id");
	if (!id) {
		return apiError("Category id is required", 400);
	}

	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("forum_categories").delete().eq("id", id);
	if (error) {
		return apiError("Could not delete category", 400, error.message);
	}
	return apiOk({ success: true });
}
