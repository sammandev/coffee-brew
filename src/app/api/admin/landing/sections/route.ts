import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { landingSectionSchema } from "@/lib/validators";

function normalizeSectionPayload(body: unknown) {
	if (!body || typeof body !== "object") return body;
	const payload = body as Record<string, unknown>;
	const status =
		typeof payload.status === "string"
			? payload.status
			: typeof payload.is_visible === "boolean"
				? payload.is_visible
					? "published"
					: "hidden"
				: "published";
	return {
		...payload,
		status,
		is_visible: status === "published",
	};
}

export async function POST(request: Request) {
	const permission = await requirePermission("landing", "create");
	if (permission.response) return permission.response;

	const body = normalizeSectionPayload(await request.json());
	const parsed = landingSectionSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("landing_sections")
		.insert({
			...parsed.data,
			is_visible: parsed.data.status === "published",
			created_by: permission.context?.userId,
		})
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create section", 400, error.message);
	}

	return apiOk({ section: data }, 201);
}

export async function PUT(request: Request) {
	const permission = await requirePermission("landing", "update");
	if (permission.response) return permission.response;

	const body = (await request.json()) as Record<string, unknown>;
	const sectionId = String(body.id ?? "");

	if (!sectionId) {
		return apiError("Section id is required", 400);
	}

	const updatePayload: Record<string, unknown> = {};

	if (typeof body.title === "string") updatePayload.title = body.title;
	if (typeof body.title_id === "string" || body.title_id === null) updatePayload.title_id = body.title_id;
	if (typeof body.subtitle === "string" || body.subtitle === null) updatePayload.subtitle = body.subtitle;
	if (typeof body.subtitle_id === "string" || body.subtitle_id === null) updatePayload.subtitle_id = body.subtitle_id;
	if (typeof body.body === "string" || body.body === null) updatePayload.body = body.body;
	if (typeof body.body_id === "string" || body.body_id === null) updatePayload.body_id = body.body_id;
	if (typeof body.section_type === "string") updatePayload.section_type = body.section_type;
	if (typeof body.order_index === "number") updatePayload.order_index = body.order_index;
	if (typeof body.status === "string") {
		if (body.status !== "draft" && body.status !== "published" && body.status !== "hidden") {
			return apiError("Invalid status", 400);
		}
		updatePayload.status = body.status;
		updatePayload.is_visible = body.status === "published";
	} else if (typeof body.is_visible === "boolean") {
		updatePayload.is_visible = body.is_visible;
		updatePayload.status = body.is_visible ? "published" : "hidden";
	}
	if (typeof body.config === "object" && body.config !== null) updatePayload.config = body.config;
	if (typeof body.config_id === "object" && body.config_id !== null) updatePayload.config_id = body.config_id;

	if (Object.keys(updatePayload).length === 0) {
		return apiError("No fields to update", 400);
	}

	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("landing_sections")
		.update(updatePayload)
		.eq("id", sectionId)
		.select("*")
		.single();

	if (error) {
		return apiError("Could not update section", 400, error.message);
	}

	return apiOk({ section: data });
}

export async function DELETE(request: Request) {
	const permission = await requirePermission("landing", "delete");
	if (permission.response) return permission.response;

	const body = (await request.json()) as { id?: string };

	if (!body.id) {
		return apiError("Section id is required", 400);
	}

	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("landing_sections").delete().eq("id", body.id);

	if (error) {
		return apiError("Could not delete section", 400, error.message);
	}

	return apiOk({ success: true });
}
