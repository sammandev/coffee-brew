import { apiError, apiOk } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

interface SharedBrewRow {
	id: string;
	name: string;
	brew_method: string;
	bean_process: string | null;
	coffee_beans: string;
	brand_roastery: string;
	brewer_name: string;
	image_url: string | null;
	image_alt: string | null;
	grind_reference_image_url: string | null;
	grind_reference_image_alt: string | null;
	recommended_methods: string[];
	tags: string[];
	status: string;
	created_at: string;
	updated_at: string;
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	const normalizedToken = token.trim();
	if (!normalizedToken) return apiError("Not found", 404);

	const supabase = createSupabaseAdminClient();
	const { data: share } = await supabase
		.from("brew_collection_shares")
		.select("owner_id, token, is_active")
		.eq("token", normalizedToken)
		.eq("is_active", true)
		.maybeSingle<{ owner_id: string; token: string; is_active: boolean }>();

	if (!share) {
		return apiError("Collection share not found", 404);
	}

	const [{ data: ownerProfile }, { data: wishlistRows }, { data: historyRows }] = await Promise.all([
		supabase.from("profiles").select("id, display_name, email, avatar_url").eq("id", share.owner_id).maybeSingle(),
		supabase
			.from("brew_wishlist")
			.select("brew_id, created_at")
			.eq("user_id", share.owner_id)
			.order("created_at", { ascending: false }),
		supabase
			.from("brew_reviews")
			.select("brew_id, overall, updated_at")
			.eq("reviewer_id", share.owner_id)
			.order("updated_at", { ascending: false })
			.limit(200),
	]);

	const brewIds = Array.from(
		new Set([...(wishlistRows ?? []).map((row) => row.brew_id), ...(historyRows ?? []).map((row) => row.brew_id)]),
	);

	const { data: brewRows } =
		brewIds.length > 0
			? await supabase
					.from("brews")
					.select(
						"id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, grind_reference_image_url, grind_reference_image_alt, recommended_methods, tags, status, created_at, updated_at",
					)
					.in("id", brewIds)
					.eq("status", "published")
			: { data: [] as SharedBrewRow[] };

	const publishedById = new Map((brewRows ?? []).map((row) => [row.id, row]));
	const history = (historyRows ?? [])
		.map((row) => {
			const brew = publishedById.get(row.brew_id);
			if (!brew) return null;
			return {
				brew,
				my_overall: Number(row.overall),
				last_brewed_at: row.updated_at,
			};
		})
		.filter((value): value is NonNullable<typeof value> => Boolean(value));

	const wishlist = (wishlistRows ?? [])
		.map((row) => {
			const brew = publishedById.get(row.brew_id);
			if (!brew) return null;
			return {
				brew,
				saved_at: row.created_at,
			};
		})
		.filter((value): value is NonNullable<typeof value> => Boolean(value));

	return apiOk({
		owner: ownerProfile
			? {
					id: ownerProfile.id,
					display_name: ownerProfile.display_name?.trim() || ownerProfile.email || "Unknown User",
					avatar_url: ownerProfile.avatar_url,
				}
			: null,
		wishlist,
		history,
	});
}
