import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/config/client";
import { serverEnv } from "@/lib/config/server";

export function createSupabaseAdminClient() {
	return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
