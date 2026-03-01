import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { parseCompareIds } from "@/lib/brew-collections";
import { aggregateRatings } from "@/lib/rating";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const ids = parseCompareIds(new URL(request.url).searchParams.get("ids"));
	if (ids.length < 2 || ids.length > 3) {
		return apiError("Invalid query", 400, "Compare supports 2 to 3 brew IDs.");
	}

	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();
	const { data: brews, error } = await supabase
		.from("brews")
		.select(
			"id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, grind_reference_image_url, grind_reference_image_alt, recommended_methods, tags, status, created_at, updated_at",
		)
		.in("id", ids)
		.eq("status", "published");

	if (error) {
		return apiError("Could not load compare brews", 400, error.message);
	}

	const byId = new Map((brews ?? []).map((row) => [row.id, row]));
	const orderedBrews = ids
		.map((id) => byId.get(id))
		.filter((value): value is NonNullable<typeof value> => Boolean(value));

	const reviewRows =
		orderedBrews.length > 0
			? await supabase
					.from("brew_reviews")
					.select("brew_id, reviewer_id, acidity, sweetness, body, aroma, balance, overall, notes, updated_at")
					.in(
						"brew_id",
						orderedBrews.map((row) => row.id),
					)
			: { data: [] as Array<Record<string, unknown>>, error: null };

	if (reviewRows.error) {
		return apiError("Could not load compare ratings", 400, reviewRows.error.message);
	}

	const reviewsByBrew = new Map<
		string,
		Array<{ acidity: number; sweetness: number; body: number; aroma: number; balance: number }>
	>();
	const myReviewByBrew = new Map<
		string,
		{
			acidity: number;
			sweetness: number;
			body: number;
			aroma: number;
			balance: number;
			overall: number;
			updated_at: string;
		}
	>();

	for (const row of reviewRows.data ?? []) {
		const brewId = String(row.brew_id ?? "");
		if (!brewId) continue;
		const list = reviewsByBrew.get(brewId) ?? [];
		list.push({
			acidity: Number(row.acidity ?? 0),
			sweetness: Number(row.sweetness ?? 0),
			body: Number(row.body ?? 0),
			aroma: Number(row.aroma ?? 0),
			balance: Number(row.balance ?? 0),
		});
		reviewsByBrew.set(brewId, list);

		if (session && row.reviewer_id === session.userId) {
			myReviewByBrew.set(brewId, {
				acidity: Number(row.acidity ?? 0),
				sweetness: Number(row.sweetness ?? 0),
				body: Number(row.body ?? 0),
				aroma: Number(row.aroma ?? 0),
				balance: Number(row.balance ?? 0),
				overall: Number(row.overall ?? 0),
				updated_at: String(row.updated_at ?? ""),
			});
		}
	}

	const items = orderedBrews.map((brew) => {
		const brewReviews = reviewsByBrew.get(brew.id) ?? [];
		return {
			brew,
			aggregate: aggregateRatings(brewReviews),
			my_review: myReviewByBrew.get(brew.id) ?? null,
		};
	});

	return apiOk({ items });
}
