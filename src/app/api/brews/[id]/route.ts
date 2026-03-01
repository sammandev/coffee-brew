import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { normalizeRecommendedMethods } from "@/lib/brew-catalog";
import { BREW_IMAGE_BUCKET, toManagedBrewImagePath } from "@/lib/brew-images";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase-errors";
import type { Role } from "@/lib/types";
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

type BrewRecord = Record<string, unknown>;

async function getUserRoleById(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	userId: string,
): Promise<Role | null> {
	const { data, error } = await supabase.rpc("user_role", { user_id: userId });
	if (error) {
		return null;
	}
	if (data === "user" || data === "admin" || data === "superuser") {
		return data;
	}
	return null;
}

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

async function updateAndLoadBrew(
	supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
	id: string,
	patch: BrewRecord,
	current: BrewRecord,
) {
	const updateResult = await supabase.from("brews").update(patch).eq("id", id);
	if (updateResult.error) {
		return { brew: null as BrewRecord | null, error: updateResult.error };
	}

	const refreshed = await supabase.from("brews").select("*").eq("id", id).maybeSingle();
	if (refreshed.error) {
		return {
			brew: {
				...current,
				...patch,
			},
			error: null,
		};
	}

	return {
		brew:
			refreshed.data ??
			({
				...current,
				...patch,
			} as BrewRecord),
		error: null,
	};
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();

	const { data: brew, error } = await supabase.from("brews").select("*").eq("id", id).maybeSingle();

	if (error || !brew) {
		return apiError("Brew not found", 404);
	}

	if (brew.status !== "published") {
		if (!session) {
			return apiError("Unauthorized", 401);
		}

		const isOwner = brew.owner_id === session.userId;
		const isAdmin = session.role === "admin" || session.role === "superuser";

		if (!isOwner && !isAdmin) {
			return apiError("Forbidden", 403);
		}
	}

	return apiOk({ brew });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();

	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return apiError("Invalid brew payload", 400);
	}
	const payload = body as Record<string, unknown>;

	const { data: current } = await supabase.from("brews").select("*").eq("id", id).maybeSingle();

	if (!current) {
		return apiError("Brew not found", 404);
	}

	const isOwner = current.owner_id === session.userId;
	if (!isOwner) {
		if (session.role === "admin") {
			const ownerRole = await getUserRoleById(supabase, current.owner_id);
			if (!ownerRole) {
				return apiError("Forbidden", 403, "Unable to verify brew owner role.");
			}
			if (ownerRole === "superuser") {
				return apiError("Forbidden", 403, "Admin cannot moderate superuser brews.");
			}
		} else if (session.role !== "superuser") {
			return apiError("Forbidden", 403);
		}
	}

	const normalizedBody = (() => {
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

	const previousImageUrl = typeof current.image_url === "string" ? current.image_url : null;
	const previousGrindReferenceImageUrl =
		typeof current.grind_reference_image_url === "string" ? current.grind_reference_image_url : null;
	const nextImageUrl = parsed.data.imageUrl ?? null;
	const nextGrindReferenceImageUrl = parsed.data.grindReferenceImageUrl ?? null;

	const updatePayload = {
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

	let imageColumnsApplied = true;
	let { brew: data, error } = await updateAndLoadBrew(
		supabase,
		id,
		{
			...updatePayload,
			image_url: nextImageUrl,
			image_alt: parsed.data.imageAlt ?? null,
			tags: parsed.data.tags ?? [],
		},
		current as BrewRecord,
	);

	if (error && isMissingColumnError(error, [...BREW_OPTIONAL_COLUMNS])) {
		const missingImageColumns = isMissingColumnError(error, ["image_url", "image_alt"]);
		const missingTagsColumn = isMissingColumnError(error, ["tags"]);
		const missingBeanProcessColumn = isMissingColumnError(error, ["bean_process"]);
		const missingRecommendedMethodsColumn = isMissingColumnError(error, ["recommended_methods"]);
		const missingGrindReferenceImageColumns = isMissingColumnError(error, [
			"grind_reference_image_url",
			"grind_reference_image_alt",
		]);
		imageColumnsApplied = !missingImageColumns;

		console.warn("[brews:update] optional columns missing; retrying update with compatibility payload");
		const compatibilityPayload: Record<string, unknown> = {
			...updatePayload,
			...(missingImageColumns
				? {}
				: {
						image_url: nextImageUrl,
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

		({ brew: data, error } = await updateAndLoadBrew(supabase, id, compatibilityPayload, current as BrewRecord));
	}

	if (error) {
		return apiError("Could not update brew", 400, error.message);
	}

	if (imageColumnsApplied) {
		const removedPaths: string[] = [];
		if (previousImageUrl && previousImageUrl !== nextImageUrl) {
			const previousPath = toManagedBrewImagePath(previousImageUrl);
			if (previousPath) removedPaths.push(previousPath);
		}
		if (previousGrindReferenceImageUrl && previousGrindReferenceImageUrl !== nextGrindReferenceImageUrl) {
			const previousPath = toManagedBrewImagePath(previousGrindReferenceImageUrl);
			if (previousPath) removedPaths.push(previousPath);
		}

		if (removedPaths.length > 0) {
			await createSupabaseAdminClient().storage.from(BREW_IMAGE_BUCKET).remove(removedPaths);
		}
	}

	return apiOk({ brew: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();

	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const { data: current } = await supabase.from("brews").select("*").eq("id", id).maybeSingle();

	if (!current) {
		return apiError("Brew not found", 404);
	}

	const isOwner = current.owner_id === session.userId;
	if (!isOwner) {
		if (session.role === "superuser") {
			// allow
		} else if (session.role === "admin") {
			const ownerRole = await getUserRoleById(supabase, current.owner_id);
			if (!ownerRole) {
				return apiError("Forbidden", 403, "Unable to verify brew owner role.");
			}
			if (ownerRole === "superuser") {
				return apiError("Forbidden", 403, "Admin cannot moderate superuser brews.");
			}
		} else {
			return apiError("Forbidden", 403);
		}
	}

	const { error } = await supabase.from("brews").delete().eq("id", id);

	if (error) {
		return apiError("Could not delete brew", 400, error.message);
	}

	const removedPaths = [
		toManagedBrewImagePath(typeof current.image_url === "string" ? current.image_url : null),
		toManagedBrewImagePath(
			typeof current.grind_reference_image_url === "string" ? current.grind_reference_image_url : null,
		),
	].filter((value): value is string => Boolean(value));
	if (removedPaths.length > 0) {
		await createSupabaseAdminClient().storage.from(BREW_IMAGE_BUCKET).remove(removedPaths);
	}

	return apiOk({ success: true });
}
