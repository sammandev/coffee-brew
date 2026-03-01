import { apiError, apiOk } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { faqItemSchema } from "@/lib/validators";

function normalizeFaqPayload(body: unknown) {
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
	const permission = await requirePermission("landing", "update");
	if (permission.response) return permission.response;

	const body = normalizeFaqPayload(await request.json());
	const parsed = faqItemSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("faq_items")
		.insert({
			...parsed.data,
			is_visible: parsed.data.status === "published",
			created_by: permission.context?.userId,
		})
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create FAQ item", 400, error.message);
	}

	revalidatePublicCache([CACHE_TAGS.FAQ, CACHE_TAGS.LANDING]);

	return apiOk({ item: data }, 201);
}

export async function PUT(request: Request) {
	const permission = await requirePermission("landing", "update");
	if (permission.response) return permission.response;

	const body = (await request.json()) as Record<string, unknown>;
	const id = typeof body.id === "string" ? body.id : "";

	if (!id) {
		return apiError("FAQ id is required", 400);
	}

	const patch: Record<string, unknown> = {};

	if (typeof body.question_en === "string") patch.question_en = body.question_en;
	if (typeof body.answer_en === "string") patch.answer_en = body.answer_en;
	if (typeof body.question_id === "string") patch.question_id = body.question_id;
	if (typeof body.answer_id === "string") patch.answer_id = body.answer_id;
	if (typeof body.order_index === "number") patch.order_index = body.order_index;
	if (typeof body.status === "string") {
		if (body.status !== "draft" && body.status !== "published" && body.status !== "hidden") {
			return apiError("Invalid status", 400);
		}
		patch.status = body.status;
		patch.is_visible = body.status === "published";
	} else if (typeof body.is_visible === "boolean") {
		patch.is_visible = body.is_visible;
		patch.status = body.is_visible ? "published" : "hidden";
	}

	if (Object.keys(patch).length === 0) {
		return apiError("No fields to update", 400);
	}

	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase.from("faq_items").update(patch).eq("id", id).select("*").single();

	if (error) {
		return apiError("Could not update FAQ item", 400, error.message);
	}

	revalidatePublicCache([CACHE_TAGS.FAQ, CACHE_TAGS.LANDING]);

	return apiOk({ item: data });
}

export async function DELETE(request: Request) {
	const permission = await requirePermission("landing", "update");
	if (permission.response) return permission.response;

	const body = (await request.json()) as { id?: string };

	if (!body.id) {
		return apiError("FAQ id is required", 400);
	}

	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("faq_items").delete().eq("id", body.id);

	if (error) {
		return apiError("Could not delete FAQ item", 400, error.message);
	}

	revalidatePublicCache([CACHE_TAGS.FAQ, CACHE_TAGS.LANDING]);

	return apiOk({ success: true });
}
