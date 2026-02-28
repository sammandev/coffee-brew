import { requireRole } from "@/components/auth-guard";
import { BadgeDefinitionsManager } from "@/components/forms/badge-definitions-manager";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BadgeDefinitionRecord } from "@/lib/types";

export default async function DashboardBadgeDefinitionsPage() {
	await requireRole({ minRole: "superuser", onUnauthorized: "forbidden" });
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);
	const { data: badges } = await supabase
		.from("badge_definitions")
		.select("id, badge_key, label_en, label_id, min_points, color_hex, is_active, created_at, updated_at")
		.order("min_points", { ascending: true });

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-(--espresso)">
				{locale === "id" ? "Pengelolaan Badge" : "Badge Definitions"}
			</h1>
			<BadgeDefinitionsManager badges={(badges ?? []) as BadgeDefinitionRecord[]} />
		</div>
	);
}
