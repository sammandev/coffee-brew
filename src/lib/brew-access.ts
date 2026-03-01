import type { BrewStatus, Role } from "@/lib/types";

export function canReadUnpublishedBrew(role: Role | null | undefined) {
	return role === "admin" || role === "superuser";
}

export function canAccessBrew(status: BrewStatus | string, role: Role | null | undefined) {
	if (status === "published") {
		return true;
	}

	return canReadUnpublishedBrew(role);
}
