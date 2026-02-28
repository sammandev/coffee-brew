import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, UserStatus } from "@/lib/types";

export interface SessionContext {
	userId: string;
	email: string;
	role: Role;
	status: UserStatus;
}

export async function getSessionContext(): Promise<SessionContext | null> {
	const supabase = await createSupabaseServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return null;
	}

	const [profileResult, roleAssignmentResult] = await Promise.all([
		supabase.from("profiles").select("status").eq("id", user.id).single<{ status: UserStatus }>(),
		supabase.from("user_roles").select("role_id").eq("user_id", user.id).maybeSingle<{ role_id: string }>(),
	]);

	const { data: roleRecord } = roleAssignmentResult?.data
		? await supabase
				.from("roles")
				.select("name")
				.eq("id", roleAssignmentResult.data.role_id)
				.maybeSingle<{ name: Role }>()
		: { data: null };

	const status = profileResult.data?.status ?? "active";
	const role = roleRecord?.name ?? "user";

	return {
		userId: user.id,
		email: user.email ?? "",
		role,
		status,
	};
}

export async function requireSessionContext() {
	const context = await getSessionContext();
	if (!context) {
		throw new Error("UNAUTHORIZED");
	}
	if (context.status !== "active") {
		throw new Error("ACCOUNT_DISABLED");
	}
	return context;
}
