import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/config/client";
import { serverEnv } from "@/lib/config/server";

/**
 * Creates a Supabase client using the service-role key, which bypasses all
 * Row Level Security (RLS) policies. Use only for trusted server-side
 * operations that genuinely require elevated access (e.g., admin tasks,
 * background jobs). Never expose this client or its key to the browser.
 *
 * All usages should be accompanied by an audit log entry where applicable.
 */
export function createSupabaseAdminClient() {
	return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
