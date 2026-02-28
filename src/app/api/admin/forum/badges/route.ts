import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { badgeDefinitionSchema } from "@/lib/validators";

export async function GET() {
	const permission = await requirePermission("users", "manage_users");
	if (permission.response) return permission.response;

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("badge_definitions")
		.select("id, badge_key, label_en, label_id, min_points, color_hex, is_active, created_at, updated_at")
		.order("min_points", { ascending: true });
	if (error) {
		return apiError("Could not load badge definitions", 400, error.message);
	}

	return apiOk({ badges: data ?? [] });
}

export async function POST(request: Request) {
	const permission = await requirePermission("users", "manage_users");
	if (permission.response) return permission.response;
	const body = await request.json().catch(() => null);
	const parsed = badgeDefinitionSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid badge payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("badge_definitions")
		.insert({
			badge_key: parsed.data.badge_key,
			label_en: parsed.data.label_en,
			label_id: parsed.data.label_id,
			min_points: parsed.data.min_points,
			color_hex: parsed.data.color_hex ?? null,
			is_active: parsed.data.is_active,
		})
		.select("*")
		.single();
	if (error) {
		return apiError("Could not create badge", 400, error.message);
	}
	return apiOk({ badge: data }, 201);
}

export async function PUT(request: Request) {
	const permission = await requirePermission("users", "manage_users");
	if (permission.response) return permission.response;
	const body = await request.json().catch(() => null);
	const parsed = badgeDefinitionSchema.safeParse(body);
	if (!parsed.success) {
		return apiError("Invalid badge payload", 400, parsed.error.message);
	}
	if (!parsed.data.id) {
		return apiError("Invalid badge payload", 400, "Badge id is required.");
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("badge_definitions")
		.update({
			badge_key: parsed.data.badge_key,
			label_en: parsed.data.label_en,
			label_id: parsed.data.label_id,
			min_points: parsed.data.min_points,
			color_hex: parsed.data.color_hex ?? null,
			is_active: parsed.data.is_active,
		})
		.eq("id", parsed.data.id)
		.select("*")
		.single();
	if (error) {
		return apiError("Could not update badge", 400, error.message);
	}
	return apiOk({ badge: data });
}

export async function DELETE(request: Request) {
	const permission = await requirePermission("users", "manage_users");
	if (permission.response) return permission.response;
	const id = new URL(request.url).searchParams.get("id");
	if (!id) {
		return apiError("Badge id is required", 400);
	}

	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("badge_definitions").delete().eq("id", id);
	if (error) {
		return apiError("Could not delete badge", 400, error.message);
	}
	return apiOk({ success: true });
}
