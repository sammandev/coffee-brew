import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { clientEnv } from "@/lib/config/client";

export const runtime = "edge";

export async function GET() {
	const supabase = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});

	const { error } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
	if (error) {
		return NextResponse.json(
			{
				ok: false,
				error: "Database health check failed",
				timestamp: new Date().toISOString(),
			},
			{
				status: 503,
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	}

	return NextResponse.json(
		{
			ok: true,
			timestamp: new Date().toISOString(),
		},
		{
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}
