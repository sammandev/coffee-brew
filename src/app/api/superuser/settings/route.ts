import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TAB_ICON_BUCKET, toManagedTabIconPath } from "@/lib/tab-icons";
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
	const { data: existingSettings } = await supabase
		.from("site_settings")
		.select("tab_icon_url, tab_icon_storage_path")
		.eq("id", true)
		.maybeSingle();
	const previousTabIconUrl = existingSettings?.tab_icon_url ?? null;
	const nextTabIconUrl =
		parsed.data.tab_icon_url === undefined
			? (existingSettings?.tab_icon_url ?? null)
			: (parsed.data.tab_icon_url ?? null);
	const nextTabIconStoragePath =
		parsed.data.tab_icon_storage_path === undefined
			? (existingSettings?.tab_icon_storage_path ?? null)
			: (parsed.data.tab_icon_storage_path ?? null);

	const { data, error } = await supabase
		.from("site_settings")
		.update({
			...parsed.data,
			home_title_en: parsed.data.home_title_en || null,
			home_title_id: parsed.data.home_title_id || null,
			home_subtitle_en: parsed.data.home_subtitle_en || null,
			home_subtitle_id: parsed.data.home_subtitle_id || null,
			tab_icon_url: nextTabIconUrl,
			tab_icon_storage_path: nextTabIconStoragePath,
		})
		.eq("id", true)
		.select("*")
		.single();

	if (error) {
		return apiError("Could not update settings", 400, error.message);
	}

	if (previousTabIconUrl && previousTabIconUrl !== nextTabIconUrl) {
		const previousPath = toManagedTabIconPath(previousTabIconUrl);
		if (previousPath) {
			await createSupabaseAdminClient().storage.from(TAB_ICON_BUCKET).remove([previousPath]);
		}
	}

	return apiOk({ settings: data });
}
