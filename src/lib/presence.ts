import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isOnlineByLastActive(lastActiveAt: string | null | undefined) {
	if (!lastActiveAt) return false;
	const timestamp = new Date(lastActiveAt).getTime();
	if (!Number.isFinite(timestamp)) return false;
	return Date.now() - timestamp <= ONLINE_WINDOW_MS;
}

export async function touchUserPresence(userId: string) {
	const supabase = await createSupabaseServerClient();
	await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
}
