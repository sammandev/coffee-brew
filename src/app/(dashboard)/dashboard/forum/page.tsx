import { requireRole } from "@/components/auth-guard";
import { ForumTaxonomyManager } from "@/components/forms/forum-taxonomy-manager";
import { getServerI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ForumCategory, ForumSubforum } from "@/lib/types";

export default async function DashboardForumTaxonomyPage() {
	await requireRole({ minRole: "admin", onUnauthorized: "forbidden" });
	const [{ locale }, supabase] = await Promise.all([getServerI18n(), createSupabaseServerClient()]);

	const [{ data: categories }, { data: subforums }] = await Promise.all([
		supabase
			.from("forum_categories")
			.select(
				"id, slug, name_en, name_id, description_en, description_id, order_index, is_visible, created_at, updated_at",
			)
			.order("order_index", { ascending: true }),
		supabase
			.from("forum_subforums")
			.select(
				"id, category_id, slug, name_en, name_id, description_en, description_id, order_index, is_visible, created_at, updated_at",
			)
			.order("order_index", { ascending: true }),
	]);

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-(--espresso)">
				{locale === "id" ? "Pengelolaan Struktur Forum" : "Forum Taxonomy Management"}
			</h1>
			<ForumTaxonomyManager
				categories={(categories ?? []) as ForumCategory[]}
				subforums={(subforums ?? []) as ForumSubforum[]}
			/>
		</div>
	);
}
