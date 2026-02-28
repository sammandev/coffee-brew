import { forbidden, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import type { Role } from "@/lib/types";

interface RequireRoleOptions {
	exactRole?: Role;
	minRole?: Role;
	onUnauthorized?: "redirect" | "forbidden";
	redirectTo?: string;
}

function handleUnauthorized(options: RequireRoleOptions) {
	if (options.onUnauthorized === "forbidden") {
		forbidden();
	}

	redirect(options.redirectTo ?? "/dashboard");
}

export async function requireRole(options: RequireRoleOptions = {}) {
	const context = await getSessionContext();

	if (!context) {
		redirect("/login");
	}

	if (context.status !== "active") {
		redirect("/login?reason=blocked");
	}

	if (options.exactRole && context.role !== options.exactRole) {
		handleUnauthorized(options);
	}

	if (!options.minRole) {
		return context;
	}

	if (options.minRole === "admin") {
		if (context.role !== "admin" && context.role !== "superuser") {
			handleUnauthorized(options);
		}
	}

	if (options.minRole === "superuser" && context.role !== "superuser") {
		handleUnauthorized(options);
	}

	return context;
}
