import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase-errors";

const FULL_BREW_SELECT =
	"id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, recommended_methods, tags, status, created_at";
const FALLBACK_BREW_SELECT = "id, name, brew_method, coffee_beans, brand_roastery, brewer_name, status, created_at";
type WishlistBrewRow = {
	bean_process?: string | null;
	brewer_name: string;
	brand_roastery: string;
	coffee_beans: string;
	created_at: string;
	brew_method: string;
	id: string;
	image_alt?: string | null;
	image_url?: string | null;
	name: string;
	recommended_methods?: string[] | null;
	status: string;
	tags?: string[] | null;
};

export async function GET() {
	const session = await getSessionContext();
	if (!session) return apiError("Unauthorized", 401);
	if (session.status !== "active") return apiError("Account blocked or disabled", 403);

	const supabase = await createSupabaseServerClient();
	const { data: wishlistRows, error: wishlistError } = await supabase
		.from("brew_wishlist")
		.select("brew_id, created_at")
		.eq("user_id", session.userId)
		.order("created_at", { ascending: false });

	if (wishlistError) {
		return apiError("Could not load wishlist", 400, wishlistError.message);
	}

	const brewIds = (wishlistRows ?? []).map((row) => row.brew_id);
	if (brewIds.length === 0) {
		return apiOk({ items: [] });
	}

	let brewRows: WishlistBrewRow[] | null = null;
	const fullBrewQuery = await supabase.from("brews").select(FULL_BREW_SELECT).in("id", brewIds);
	let brewError = fullBrewQuery.error;
	if (!brewError) {
		brewRows = fullBrewQuery.data as WishlistBrewRow[] | null;
	}
	if (
		brewError &&
		isMissingColumnError(brewError, ["bean_process", "image_url", "image_alt", "recommended_methods", "tags"])
	) {
		const fallback = await supabase.from("brews").select(FALLBACK_BREW_SELECT).in("id", brewIds);
		brewRows = fallback.data as WishlistBrewRow[] | null;
		brewError = fallback.error;
	}
	if (brewError) {
		return apiError("Could not load wishlist", 400, brewError.message);
	}

	const { data: reviewRows, error: reviewError } =
		brewIds.length > 0
			? await supabase
					.from("brew_reviews")
					.select("brew_id, star_rating")
					.eq("reviewer_id", session.userId)
					.in("brew_id", brewIds)
			: { data: [] as Array<{ brew_id: string; star_rating: number | null }>, error: null };

	if (reviewError) {
		return apiError("Could not load wishlist", 400, reviewError.message);
	}

	const myRatingByBrewId = new Map<string, number | null>();
	for (const review of reviewRows ?? []) {
		myRatingByBrewId.set(review.brew_id, review.star_rating != null ? Number(review.star_rating) : null);
	}

	const brewById = new Map(
		(brewRows ?? []).map((brew) => {
			return [
				brew.id,
				{
					...brew,
					bean_process: brew.bean_process ?? null,
					image_url: brew.image_url ?? null,
					image_alt: brew.image_alt ?? null,
					recommended_methods: brew.recommended_methods ?? [],
					tags: brew.tags ?? [],
				},
			];
		}),
	);

	const items = (wishlistRows ?? [])
		.map((row: { brew_id: string; created_at: string }) => {
			const brew = brewById.get(row.brew_id);
			if (!brew) return null;

			return {
				brew_id: row.brew_id,
				created_at: row.created_at,
				brew,
				my_star_rating: myRatingByBrewId.get(row.brew_id) ?? null,
			};
		})
		.filter((value): value is NonNullable<typeof value> => Boolean(value));

	return apiOk({ items });
}

export async function POST(request: Request) {
	const session = await getSessionContext();
	if (!session) return apiError("Unauthorized", 401);
	if (session.status !== "active") return apiError("Account blocked or disabled", 403);

	const body = (await request.json().catch(() => null)) as { brewId?: string } | null;
	const brewId = typeof body?.brewId === "string" ? body.brewId.trim() : "";
	if (!brewId) return apiError("Invalid payload", 400, "brewId is required.");

	const supabase = await createSupabaseServerClient();
	const { data: brew, error: brewError } = await supabase
		.from("brews")
		.select("id, status")
		.eq("id", brewId)
		.maybeSingle<{ id: string; status: string }>();

	if (brewError || !brew) {
		return apiError("Brew not found", 404);
	}
	if (brew.status !== "published") {
		return apiError("Could not add wishlist", 403, "Only published brews can be added to wishlist.");
	}

	const { error } = await supabase.from("brew_wishlist").upsert(
		{
			user_id: session.userId,
			brew_id: brewId,
		},
		{ onConflict: "user_id,brew_id" },
	);

	if (error) {
		return apiError("Could not update wishlist", 400, error.message);
	}

	return apiOk({ success: true }, 201);
}
