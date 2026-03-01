import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { normalizeRecommendedMethods } from "@/lib/brew-catalog";
import { requirePermission } from "@/lib/guards";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase-errors";
import { brewSchema } from "@/lib/validators";

const BREW_OPTIONAL_COLUMNS = [
	"image_url",
	"image_alt",
	"tags",
	"bean_process",
	"recommended_methods",
	"grind_reference_image_url",
	"grind_reference_image_alt",
] as const;

function normalizeTags(raw: unknown) {
	if (!Array.isArray(raw)) return [];
	const normalized: string[] = [];

	for (const item of raw) {
		if (typeof item !== "string") continue;
		const value = item.trim().toLowerCase();
		if (!value || normalized.includes(value)) continue;
		normalized.push(value);
	}

	return normalized.slice(0, 10);
}

export async function GET() {
	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();

	if (!session) {
		const { data, error } = await supabase
			.from("brews")
			.select("*")
			.eq("status", "published")
			.order("created_at", { ascending: false });

		if (error) {
			return apiError("Could not load brews", 400, error.message);
		}

		return apiOk({ brews: data });
	}

	const { data, error } = await supabase
		.from("brews")
		.select("*")
		.eq("owner_id", session.userId)
		.order("updated_at", { ascending: false });

	if (error) {
		return apiError("Could not load brews", 400, error.message);
	}

	return apiOk({ brews: data });
}

export async function POST(request: Request) {
	const permission = await requirePermission("brews", "create");
	if (permission.response) return permission.response;

	const body = await request.json().catch(() => null);
	const normalizedBody = (() => {
		if (!body || typeof body !== "object") return body;
		const payload = body as Record<string, unknown>;
		const notes = typeof payload.notes === "string" ? payload.notes : "";
		const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
		const imageAlt = typeof payload.imageAlt === "string" ? payload.imageAlt.trim() : "";
		const beanProcess = typeof payload.beanProcess === "string" ? payload.beanProcess.trim() : "";
		const grindReferenceImageUrl =
			typeof payload.grindReferenceImageUrl === "string" ? payload.grindReferenceImageUrl.trim() : "";
		const grindReferenceImageAlt =
			typeof payload.grindReferenceImageAlt === "string" ? payload.grindReferenceImageAlt.trim() : "";
		const tags = normalizeTags(payload.tags);
		const recommendedMethods = normalizeRecommendedMethods(payload.recommendedMethods);
		return {
			...payload,
			notes: sanitizeForStorage(notes),
			imageUrl: imageUrl.length > 0 ? imageUrl : null,
			imageAlt: imageAlt.length > 0 ? imageAlt : null,
			beanProcess: beanProcess.length > 0 ? beanProcess : null,
			grindReferenceImageUrl: grindReferenceImageUrl.length > 0 ? grindReferenceImageUrl : null,
			grindReferenceImageAlt: grindReferenceImageAlt.length > 0 ? grindReferenceImageAlt : null,
			recommendedMethods,
			tags,
		};
	})();
	const parsed = brewSchema.safeParse(normalizedBody);

	if (!parsed.success) {
		return apiError("Invalid brew payload", 400, parsed.error.message);
	}

	if (!validatePlainTextLength(parsed.data.notes ?? "", { allowEmpty: true, max: 5000 })) {
		return apiError("Invalid brew payload", 400, "Notes must be 5000 characters or fewer.");
	}

	if (parsed.data.imageAlt && !parsed.data.imageUrl) {
		return apiError("Invalid brew payload", 400, "Image alt text requires an image URL.");
	}
	if (parsed.data.grindReferenceImageAlt && !parsed.data.grindReferenceImageUrl) {
		return apiError("Invalid brew payload", 400, "Grind reference alt text requires an image URL.");
	}

	const supabase = await createSupabaseServerClient();
	const insertPayload = {
		owner_id: permission.context.userId,
		name: parsed.data.name,
		brew_method: parsed.data.brewMethod,
		bean_process: parsed.data.beanProcess ?? null,
		coffee_beans: parsed.data.coffeeBeans,
		brand_roastery: parsed.data.brandRoastery,
		water_type: parsed.data.waterType,
		water_ppm: parsed.data.waterPpm,
		temperature: parsed.data.temperature,
		temperature_unit: parsed.data.temperatureUnit,
		grind_size: parsed.data.grindSize,
		grind_clicks: parsed.data.grindClicks ?? null,
		brew_time_seconds: parsed.data.brewTimeSeconds,
		brewer_name: parsed.data.brewerName,
		notes: parsed.data.notes ?? null,
		status: parsed.data.status,
		recommended_methods: parsed.data.recommendedMethods ?? [],
		grind_reference_image_url: parsed.data.grindReferenceImageUrl ?? null,
		grind_reference_image_alt: parsed.data.grindReferenceImageAlt ?? null,
	};

	let { data, error } = await supabase
		.from("brews")
		.insert({
			...insertPayload,
			image_url: parsed.data.imageUrl ?? null,
			image_alt: parsed.data.imageAlt ?? null,
			tags: parsed.data.tags ?? [],
		})
		.select("*")
		.single();

	if (error && isMissingColumnError(error, [...BREW_OPTIONAL_COLUMNS])) {
		const missingImageColumns = isMissingColumnError(error, ["image_url", "image_alt"]);
		const missingTagsColumn = isMissingColumnError(error, ["tags"]);
		const missingBeanProcessColumn = isMissingColumnError(error, ["bean_process"]);
		const missingRecommendedMethodsColumn = isMissingColumnError(error, ["recommended_methods"]);
		const missingGrindReferenceImageColumns = isMissingColumnError(error, [
			"grind_reference_image_url",
			"grind_reference_image_alt",
		]);
		console.warn("[brews:create] optional columns missing; retrying insert with compatibility payload");

		const compatibilityPayload: Record<string, unknown> = {
			...insertPayload,
			...(missingImageColumns
				? {}
				: {
						image_url: parsed.data.imageUrl ?? null,
						image_alt: parsed.data.imageAlt ?? null,
					}),
			...(missingTagsColumn ? {} : { tags: parsed.data.tags ?? [] }),
		};

		if (missingBeanProcessColumn) delete compatibilityPayload.bean_process;
		if (missingRecommendedMethodsColumn) delete compatibilityPayload.recommended_methods;
		if (missingGrindReferenceImageColumns) {
			delete compatibilityPayload.grind_reference_image_url;
			delete compatibilityPayload.grind_reference_image_alt;
		}

		({ data, error } = await supabase.from("brews").insert(compatibilityPayload).select("*").single());
	}

	if (error) {
		return apiError("Could not create brew", 400, error.message);
	}

	return apiOk({ brew: data }, 201);
}
