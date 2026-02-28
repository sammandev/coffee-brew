import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { requirePermission } from "@/lib/guards";
import { toOverallScore } from "@/lib/rating";
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
	const parsed = reviewSchema.safeParse(body);

	if (!parsed.success) {
		return apiError("Invalid review payload", 400, parsed.error.message);
	}

	const supabase = await createSupabaseServerClient();
	const session = await getSessionContext();

	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const { data: brew } = await supabase.from("brews").select("id, status").eq("id", brewId).maybeSingle();

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

	return apiOk({ review: data });
}
