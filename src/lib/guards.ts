import { apiError } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { assertPermission } from "@/lib/permissions";
import type { PermissionAction, ResourceKey } from "@/lib/types";

export async function requirePermission(resource: ResourceKey, action: PermissionAction) {
	try {
		const context = await requireSessionContext();
		await assertPermission(context.role, resource, action);
		return { context };
	} catch (error) {
		if (error instanceof Error && error.message === "UNAUTHORIZED") {
			return { response: apiError("Unauthorized", 401) };
		}
		if (error instanceof Error && error.message === "ACCOUNT_DISABLED") {
			return { response: apiError("Account blocked or disabled", 403) };
		}
		if (error instanceof Error && error.message === "FORBIDDEN") {
			return { response: apiError("Forbidden", 403) };
		}
		return { response: apiError("Unexpected auth error", 500) };
	}
}

export function assertRecordOwnership(ownerId: string, viewerId: string) {
	if (ownerId !== viewerId) {
		throw new Error("FORBIDDEN");
	}
}
