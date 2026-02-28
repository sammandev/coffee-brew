import { LandingSectionForm } from "@/components/forms/landing-section-form";
import { LandingSectionsTable } from "@/components/forms/landing-sections-table";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLandingPage() {
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);

	const { data: sections } = await supabase
		.from("landing_sections")
		.select("id, section_type, title, order_index, is_visible")
		.order("order_index", { ascending: true });

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">
				{locale === "id" ? "Pembuat Landing Page" : "Landing Page Builder"}
			</h1>
			<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
				<LandingSectionsTable sections={sections ?? []} />
				<LandingSectionForm />
			</div>
		</div>
	);
}
