import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { BREW_IMAGE_BUCKET, toManagedBrewImagePath } from "@/lib/brew-images";
import { assertPermission } from "@/lib/permissions";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { brewSchema } from "@/lib/validators";

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
	const normalizedBody = (() => {
		if (!body || typeof body !== "object") return body;
		const payload = body as Record<string, unknown>;
		const notes = typeof payload.notes === "string" ? payload.notes : "";
		const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
		const imageAlt = typeof payload.imageAlt === "string" ? payload.imageAlt.trim() : "";
		return {
			...payload,
			notes: sanitizeForStorage(notes),
			imageUrl: imageUrl.length > 0 ? imageUrl : null,
			imageAlt: imageAlt.length > 0 ? imageAlt : null,
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

	const { data: current } = await supabase.from("brews").select("owner_id, image_url").eq("id", id).maybeSingle();

	if (!current) {
		return apiError("Brew not found", 404);
	}

	const isOwner = current.owner_id === session.userId;

	if (!isOwner) {
		try {
			await assertPermission(session.role, "brews", "moderate");
		} catch {
			return apiError("Forbidden", 403);
		}
	}

	const previousImageUrl = (current.image_url as string | null) ?? null;
	const nextImageUrl = parsed.data.imageUrl ?? null;

	const { data, error } = await supabase
		.from("brews")
		.update({
			name: parsed.data.name,
			brew_method: parsed.data.brewMethod,
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
			image_url: nextImageUrl,
			image_alt: parsed.data.imageAlt ?? null,
			status: parsed.data.status,
		})
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		return apiError("Could not update brew", 400, error.message);
	}

	if (previousImageUrl && previousImageUrl !== nextImageUrl) {
		const previousPath = toManagedBrewImagePath(previousImageUrl);
		if (previousPath) {
			await createSupabaseAdminClient().storage.from(BREW_IMAGE_BUCKET).remove([previousPath]);
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

	const { data: current } = await supabase.from("brews").select("owner_id, image_url").eq("id", id).maybeSingle();

	if (!current) {
		return apiError("Brew not found", 404);
	}

	const isOwner = current.owner_id === session.userId;
	if (!isOwner) {
		try {
			await assertPermission(session.role, "brews", "moderate");
		} catch {
			return apiError("Forbidden", 403);
		}
	}

	const { error } = await supabase.from("brews").delete().eq("id", id);

	if (error) {
		return apiError("Could not delete brew", 400, error.message);
	}

	const previousPath = toManagedBrewImagePath((current.image_url as string | null) ?? null);
	if (previousPath) {
		await createSupabaseAdminClient().storage.from(BREW_IMAGE_BUCKET).remove([previousPath]);
	}

	return apiOk({ success: true });
}
