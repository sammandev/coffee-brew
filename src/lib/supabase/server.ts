import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/config/client";

export async function createSupabaseServerClient() {
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
}
