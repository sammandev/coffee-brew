import { AccountDisabledError, UnauthorizedError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, UserStatus } from "@/lib/types";

export interface SessionContext {
	userId: string;
	email: string | null;
	role: Role;
	status: UserStatus;
}

type UserRoleWithRole = { role_id: string; roles: { name: Role } | null };

export async function getSessionContext(): Promise<SessionContext | null> {
	const supabase = await createSupabaseServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return null;
	}

	// Run profile and role queries in parallel; role name is joined via FK so no
	// third serial round-trip is needed.
	const [profileResult, roleAssignmentResult] = await Promise.all([
		supabase.from("profiles").select("status").eq("id", user.id).maybeSingle<{ status: UserStatus }>(),
		supabase.from("user_roles").select("role_id, roles(name)").eq("user_id", user.id).maybeSingle<UserRoleWithRole>(),
	]);

	// M-8: A missing profile row means the auth user has no corresponding profile
	// (e.g. orphaned auth user). Treat as unauthenticated rather than defaulting
	// to "active", which would silently grant access.
	if (profileResult.error) {
		console.error("[auth] Profile query failed:", profileResult.error.message);
	} else if (!profileResult.data) {
		return null;
	}

	const status = profileResult.data?.status ?? "active";
	const role = roleAssignmentResult.data?.roles?.name ?? "user";

	return {
		userId: user.id,
		email: user.email ?? null,
		role,
		status,
	};
}

export async function requireSessionContext() {
	const context = await getSessionContext();
	if (!context) {
		throw new UnauthorizedError();
	}
	if (context.status !== "active") {
		throw new AccountDisabledError();
	}
	return context;
}

/**
 * Like `requireSessionContext().catch(() => null)` but only swallows intentional
 * auth failures (UnauthorizedError, AccountDisabledError). Infrastructure errors
 * (DB down, network timeout, etc.) are re-thrown so callers receive a 500 rather
 * than a silent 401.
 */
export async function requireSessionContextOrNull(): Promise<SessionContext | null> {
	try {
		return await requireSessionContext();
	} catch (err) {
		if (err instanceof UnauthorizedError || err instanceof AccountDisabledError) {
			return null;
		}
		throw err;
	}
}
