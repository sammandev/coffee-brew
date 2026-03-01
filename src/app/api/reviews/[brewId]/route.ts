import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { revalidatePublicCache } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requirePermission } from "@/lib/guards";
import { createNotifications } from "@/lib/notifications";
import { toOverallScore } from "@/lib/rating";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ brewId: string }> }) {
	const { brewId } = await params;
	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase
		.from("brew_reviews")
		.select("acidity, sweetness, body, aroma, balance, notes, reviewer_id, updated_at")
		.eq("brew_id", brewId)
		.order("updated_at", { ascending: false });

	if (error) {
		return apiError("Could not fetch reviews", 400, error.message);
	}

	return apiOk({ reviews: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ brewId: string }> }) {
	const { brewId } = await params;

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
	const session = await getSessionContext();

	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const { data: brew } = await supabase
		.from("brews")
		.select("id, name, owner_id, status")
		.eq("id", brewId)
		.maybeSingle();

	if (!brew || brew.status === "hidden") {
		return apiError("Brew not available for review", 404);
	}

	const { data, error } = await supabase
		.from("brew_reviews")
		.upsert(
			{
				brew_id: brewId,
				reviewer_id: session.userId,
				acidity: parsed.data.acidity,
				sweetness: parsed.data.sweetness,
				body: parsed.data.body,
				aroma: parsed.data.aroma,
				balance: parsed.data.balance,
				overall: toOverallScore(parsed.data),
				notes: parsed.data.notes ?? null,
			},
			{
				onConflict: "brew_id,reviewer_id",
			},
		)
		.select("*")
		.single();

	if (error) {
		return apiError("Could not save review", 400, error.message);
	}

	const { data: actorProfile } = await supabase
		.from("profiles")
		.select("display_name")
		.eq("id", session.userId)
		.maybeSingle<{ display_name: string | null }>();
	const actorName = actorProfile?.display_name?.trim() || session.email.split("@")[0] || "Someone";

	if (brew.owner_id !== session.userId) {
		await createNotifications([
			{
				recipientId: brew.owner_id,
				actorId: session.userId,
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
