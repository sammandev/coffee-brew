import "server-only";

import { z } from "zod";
import { clientEnv } from "@/lib/config/client";

const serverEnvSchema = z.object({
	// No default — must be explicitly set. The service-role key bypasses all RLS;
	// a missing value must fail at startup, not silently at runtime.
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
	RESEND_API_KEY: z.string().min(1).optional(),
	RESEND_FROM_EMAIL: z.string().min(1).optional(),
	BREVO_API_KEY: z.string().min(1).optional(),
	BREVO_BASE_URL: z.string().url().default("https://api.brevo.com/v3"),
	BREVO_LIST_IDS: z.string().min(1).optional(),
	BREVO_LIST_ID: z.string().min(1).optional(),
	TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);
if (!parsed.success) {
	throw new Error(`Invalid server environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const serverEnv = {
	...parsed.data,
	...clientEnv,
};
