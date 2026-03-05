import { apiError, apiOk } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isLikelyUuid } from "@/lib/forum";
import { requirePermission } from "@/lib/guards";
import { createNotifications } from "@/lib/notifications";
import { toOverallScore } from "@/lib/rating";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ brewId: string }> }) {
	const { brewId } = await params;
	if (!isLikelyUuid(brewId)) {
		return apiError("Invalid brew ID", 400);
	}
	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("brew_reviews")
		.select("acidity, sweetness, body, aroma, balance, star_rating, notes, reviewer_id, updated_at")
		.eq("brew_id", brewId)
		.order("updated_at", { ascending: false });

	if (error) {
		return apiError("Could not fetch reviews", 500, error.message);
	}

	return apiOk({ reviews: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ brewId: string }> }) {
	const { brewId } = await params;
	if (!isLikelyUuid(brewId)) {
		return apiError("Invalid brew ID", 400);
	}

	const permission = await requirePermission("reviews", "create");
	if (permission.response) return permission.response;

	const body = await request.json();
	const normalizedBody = (() => {
		if (!body || typeof body !== "object") return body;
		const payload = body as Record<string, unknown>;
		const notes = typeof payload.notes === "string" ? payload.notes : "";
		return {
			...payload,
			notes: sanitizeForStorage(notes),
		};
	})();
	const parsed = reviewSchema.safeParse(normalizedBody);

	if (!parsed.success) {
		return apiError("Invalid review payload", 400, parsed.error.message);
	}

	if (!validatePlainTextLength(parsed.data.notes ?? "", { allowEmpty: true, max: 2000 })) {
		return apiError("Invalid review payload", 400, "Notes must be 2000 characters or fewer.");
	}

	const supabase = await createSupabaseServerClient();

	const { data: brew } = await supabase
		.from("brews")
		.select("id, name, owner_id, status")
		.eq("id", brewId)
		.maybeSingle();

	if (!brew || brew.status === "hidden" || brew.status === "draft") {
		return apiError("Brew not available for review", 404);
	}

	const { data, error } = await supabase
		.from("brew_reviews")
		.upsert(
			{
				brew_id: brewId,
				reviewer_id: permission.context.userId,
				acidity: parsed.data.acidity,
				sweetness: parsed.data.sweetness,
				body: parsed.data.body,
				aroma: parsed.data.aroma,
				balance: parsed.data.balance,
				overall: toOverallScore(parsed.data),
				star_rating: parsed.data.star_rating,
				notes: parsed.data.notes ?? null,
			},
			{
				onConflict: "brew_id,reviewer_id",
			},
		)
		.select(
			"id, brew_id, reviewer_id, acidity, sweetness, body, aroma, balance, overall, star_rating, notes, created_at, updated_at",
		)
		.single();

	if (error) {
		return apiError("Could not save review", 500, error.message);
	}

	const { data: actorProfile } = await supabase
		.from("profiles")
		.select("display_name")
		.eq("id", permission.context.userId)
		.maybeSingle<{ display_name: string | null }>();
	const actorName = actorProfile?.display_name?.trim() || permission.context.email?.split("@")[0] || "Someone";

	if (brew.owner_id !== permission.context.userId) {
		await createNotifications([
			{
				recipientId: brew.owner_id,
				actorId: permission.context.userId,
				eventType: "review",
				title: `${actorName} reviewed your brew`,
				body: `Your brew "${brew.name}" has a new rating update.`,
				linkPath: `/brew/${brewId}#reviews`,
				metadata: {
					brew_id: brewId,
					review_id: data.id,
				},
			},
		]);
	}

	revalidatePublicCache([CACHE_TAGS.BREWS, CACHE_TAGS.BREW_DETAIL, CACHE_TAGS.LANDING]);

	return apiOk({ review: data });
}
