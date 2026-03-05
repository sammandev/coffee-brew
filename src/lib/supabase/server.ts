import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { clientEnv } from "@/lib/config/client";

/**
 * Returns a Supabase server client scoped to the current request's cookies.
 * Memoized with React.cache() so repeated calls within the same request
 * share the same client instance instead of creating a new one each time.
 */
export const createSupabaseServerClient = cache(async function createSupabaseServerClient() {
	const cookieStore = await cookies();

	return createServerClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				for (const cookie of cookiesToSet) {
					cookieStore.set(cookie.name, cookie.value, cookie.options);
				}
			},
		},
	});
});
