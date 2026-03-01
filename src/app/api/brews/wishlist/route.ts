import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
	const session = await getSessionContext();
	if (!session) return apiError("Unauthorized", 401);
	if (session.status !== "active") return apiError("Account blocked or disabled", 403);

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("brew_wishlist")
		.select(
			"brew_id, created_at, brews(id, name, brew_method, bean_process, coffee_beans, brand_roastery, brewer_name, image_url, image_alt, recommended_methods, tags, status, created_at)",
		)
		.eq("user_id", session.userId)
		.order("created_at", { ascending: false });

	if (error) {
		return apiError("Could not load wishlist", 400, error.message);
	}

	const items = (data ?? [])
		.map((row) => {
			const brew = Array.isArray(row.brews) ? row.brews[0] : row.brews;
			if (!brew) return null;
			return {
				brew_id: row.brew_id,
				created_at: row.created_at,
				brew,
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
