import "server-only";

import { z } from "zod";
import { clientEnv } from "@/lib/config/client";

const serverEnvSchema = z.object({
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default("placeholder-service-role"),
	RESEND_API_KEY: z.string().min(1).optional(),
	RESEND_FROM_EMAIL: z.string().email().optional(),
	BREVO_API_KEY: z.string().min(1).optional(),
	BREVO_BASE_URL: z.string().url().default("https://api.brevo.com/v3"),
	BREVO_LIST_IDS: z.string().min(1).optional(),
	BREVO_LIST_ID: z.string().min(1).optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);
if (!parsed.success) {
	throw new Error(`Invalid server environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const serverEnv = {
	...parsed.data,
	...clientEnv,
};
