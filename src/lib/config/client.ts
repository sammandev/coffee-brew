import { z } from "zod";

const clientEnvSchema = z.object({
	NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
	NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://placeholder.supabase.co"),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("placeholder-anon-key"),
	NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
	NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
});

const parsed = clientEnvSchema.safeParse({
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
	NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
	NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
if (!parsed.success) {
	throw new Error(`Invalid client environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const clientEnv = parsed.data;
