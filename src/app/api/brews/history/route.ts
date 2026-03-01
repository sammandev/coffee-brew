import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
	const session = await getSessionContext();
	if (!session) return apiError("Unauthorized", 401);
	if (session.status !== "active") return apiError("Account blocked or disabled", 403);

	const supabase = await createSupabaseServerClient();
	const { data: reviewRows, error: reviewError } = await supabase
		.from("brew_reviews")
		.select("brew_id, overall, updated_at")
		.eq("reviewer_id", session.userId)
		.order("updated_at", { ascending: false })
		.limit(200);

	if (reviewError) {
		return apiError("Could not load brew history", 400, reviewError.message);
	}

	const brewIds = (reviewRows ?? []).map((row) => row.brew_id);
	if (brewIds.length === 0) {
		return apiOk({ items: [] });
	}

	const { data: brewRows } = await supabase
		.from("brews")
		.select(
			"id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, grind_reference_image_url, grind_reference_image_alt, recommended_methods, tags, status, created_at, updated_at",
		)
		.in("id", brewIds);

	const brewById = new Map((brewRows ?? []).map((row) => [row.id, row]));
	const items = (reviewRows ?? [])
		.map((review) => {
			const brew = brewById.get(review.brew_id);
			if (!brew) return null;
			return {
				brew,
				my_overall: Number(review.overall),
				last_brewed_at: review.updated_at,
			};
		})
		.filter((value): value is NonNullable<typeof value> => Boolean(value));

	return apiOk({ items });
}
