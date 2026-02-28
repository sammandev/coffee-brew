import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteSettingsSchema } from "@/lib/validators";

async function requireSuperuser() {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return { response: apiError("Unauthorized", 401) };
	}

	if (session.role !== "superuser") {
		return { response: apiError("Forbidden", 403) };
	}

	return { session };
}

export async function GET() {
	const permission = await requireSuperuser();
	if (permission.response) return permission.response;

	const settings = await getSiteSettings();
	return apiOk({ settings });
}

export async function PUT(request: Request) {
	const permission = await requireSuperuser();
	if (permission.response) return permission.response;

	const body = await request.json().catch(() => null);
	const parsed = siteSettingsSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid settings payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("site_settings")
		.update({
			...parsed.data,
			home_title_en: parsed.data.home_title_en || null,
			home_title_id: parsed.data.home_title_id || null,
			home_subtitle_en: parsed.data.home_subtitle_en || null,
			home_subtitle_id: parsed.data.home_subtitle_id || null,
		})
		.eq("id", true)
		.select("*")
		.single();

	if (error) {
		return apiError("Could not update settings", 400, error.message);
	}

	return apiOk({ settings: data });
}
