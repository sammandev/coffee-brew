import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NotificationView = "active" | "archived";

function resolveLimit(request: Request) {
	const url = new URL(request.url);
	const parsed = Number(url.searchParams.get("limit") ?? 20);
	if (!Number.isFinite(parsed)) return 20;
	const normalized = Math.trunc(parsed);
	if (normalized < 1) return 1;
	if (normalized > 50) return 50;
	return normalized;
}

function resolveView(request: Request): NotificationView {
	const url = new URL(request.url);
	const view = url.searchParams.get("view");
	return view === "archived" ? "archived" : "active";
}

export async function GET(request: Request) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	const limit = resolveLimit(request);
	const view = resolveView(request);
	const supabase = await createSupabaseServerClient();
	const listQuery = supabase
		.from("user_notifications")
		.select("id, event_type, title, body, link_path, metadata, read_at, archived_at, created_at")
		.eq("recipient_id", session.userId)
		.order("created_at", { ascending: false })
		.limit(limit);
	const scopedListQuery =
		view === "archived" ? listQuery.not("archived_at", "is", null) : listQuery.is("archived_at", null);

	const [{ data: notifications, error }, { count, error: countError }] = await Promise.all([
		scopedListQuery,
		supabase
			.from("user_notifications")
			.select("id", { count: "exact", head: true })
			.eq("recipient_id", session.userId)
			.is("archived_at", null)
			.is("read_at", null),
	]);

	if (error) {
		return apiError("Could not fetch notifications", 400, error.message);
	}

	if (countError) {
		return apiError("Could not fetch notifications", 400, countError.message);
	}

	return apiOk({
		notifications: notifications ?? [],
		unread_count: count ?? 0,
		view,
	});
}
