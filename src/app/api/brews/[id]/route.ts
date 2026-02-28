import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { assertPermission } from "@/lib/permissions";
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

	const body = await request.json();
	const parsed = brewSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid brew payload", 400, parsed.error.message);
	}

	const { data: current } = await supabase.from("brews").select("owner_id").eq("id", id).maybeSingle();

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
			status: parsed.data.status,
		})
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		return apiError("Could not update brew", 400, error.message);
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

	const { data: current } = await supabase.from("brews").select("owner_id").eq("id", id).maybeSingle();

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

	return apiOk({ success: true });
}
