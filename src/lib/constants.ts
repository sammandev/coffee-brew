import type { PermissionAction, ResourceKey, Role } from "@/lib/types";

export const ROLES: Role[] = ["user", "admin", "superuser"];
export const RESOURCES: ResourceKey[] = ["landing", "brews", "catalog", "forum", "reviews", "users", "rbac"];
export const ACTIONS: PermissionAction[] = [
	"create",
	"read",
	"update",
	"delete",
	"moderate",
	"manage_permissions",
	"manage_users",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Array<{ resource: ResourceKey; action: PermissionAction }>> = {
	user: [
		{ resource: "brews", action: "create" },
		{ resource: "brews", action: "read" },
		{ resource: "brews", action: "update" },
		{ resource: "brews", action: "delete" },
		{ resource: "catalog", action: "read" },
		{ resource: "forum", action: "create" },
		{ resource: "forum", action: "read" },
		{ resource: "forum", action: "update" },
		{ resource: "forum", action: "delete" },
		{ resource: "reviews", action: "create" },
		{ resource: "reviews", action: "read" },
		{ resource: "reviews", action: "update" },
	],
	admin: [
		{ resource: "brews", action: "create" },
		{ resource: "landing", action: "create" },
		{ resource: "landing", action: "read" },
		{ resource: "landing", action: "update" },
		{ resource: "landing", action: "delete" },
		{ resource: "brews", action: "read" },
		{ resource: "brews", action: "update" },
		{ resource: "brews", action: "delete" },
		{ resource: "brews", action: "moderate" },
		{ resource: "catalog", action: "read" },
		{ resource: "forum", action: "read" },
		{ resource: "forum", action: "moderate" },
		{ resource: "reviews", action: "read" },
	],
	superuser: RESOURCES.flatMap((resource) =>
		ACTIONS.filter((action) => {
			if (resource !== "users" && action === "manage_users") return false;
			if (resource !== "rbac" && action === "manage_permissions") return false;
			return true;
		}).map((action) => ({ resource, action })),
	),
};

export const APP_NAME = "Coffee Brew";

export const FORUM_REACTION_TYPES = ["like", "coffee", "fire", "mindblown"] as const;

export type ForumReactionType = (typeof FORUM_REACTION_TYPES)[number];
