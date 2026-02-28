import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { requirePermission } from "@/lib/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { brewSchema } from "@/lib/validators";

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

	const body = await request.json();
	const parsed = brewSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid brew payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("brews")
		.insert({
			owner_id: permission.context.userId,
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
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create brew", 400, error.message);
	}

	return apiOk({ brew: data }, 201);
}
