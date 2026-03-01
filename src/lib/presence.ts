import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
export const PRESENCE_TOUCH_INTERVAL_MS = 60 * 1000;

export function isOnlineByLastActive(lastActiveAt: string | null | undefined) {
	if (!lastActiveAt) return false;
	const timestamp = new Date(lastActiveAt).getTime();
	if (!Number.isFinite(timestamp)) return false;
	return Date.now() - timestamp <= ONLINE_WINDOW_MS;
}

export async function touchUserPresence(userId: string) {
	const supabase = await createSupabaseServerClient();
	const now = new Date();
	const threshold = new Date(now.getTime() - PRESENCE_TOUCH_INTERVAL_MS).toISOString();

	await supabase
		.from("profiles")
		.update({ last_active_at: now.toISOString() })
		.eq("id", userId)
		.lt("last_active_at", threshold);
}
