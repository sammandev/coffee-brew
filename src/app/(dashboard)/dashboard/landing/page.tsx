import { LandingSectionsManager } from "@/components/forms/landing-sections-manager";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLandingPage() {
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);

	const { data: sections } = await supabase
		.from("landing_sections")
		.select(
			"id, section_type, title, title_id, subtitle, subtitle_id, body, body_id, config, config_id, order_index, is_visible",
		)
		.order("order_index", { ascending: true });

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">
				{locale === "id" ? "Pembuat Landing Page" : "Landing Page Builder"}
			</h1>
			<LandingSectionsManager sections={sections ?? []} />
		</div>
	);
}
