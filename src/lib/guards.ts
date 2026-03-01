import { apiError } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { AccountDisabledError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { assertPermission } from "@/lib/permissions";
import type { PermissionAction, ResourceKey } from "@/lib/types";

export async function requirePermission(resource: ResourceKey, action: PermissionAction) {
	try {
		const context = await requireSessionContext();
		await assertPermission(context.role, resource, action);
		return { context };
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return { response: apiError("Unauthorized", 401) };
		}
		if (error instanceof AccountDisabledError) {
			return { response: apiError("Account blocked or disabled", 403) };
		}
		if (error instanceof ForbiddenError) {
			return { response: apiError("Forbidden", 403) };
		}
		return { response: apiError("Unexpected auth error", 500) };
	}
}

export function assertRecordOwnership(ownerId: string, viewerId: string) {
	if (ownerId !== viewerId) {
		throw new ForbiddenError();
	}
}
