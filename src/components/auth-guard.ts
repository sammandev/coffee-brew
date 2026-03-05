import { forbidden, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import type { Role } from "@/lib/types";

interface RequireRoleOptions {
	exactRole?: Role;
	minRole?: Role;
	onUnauthenticated?: "redirect" | "unauthorized";
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
		if (options.onUnauthenticated === "redirect") {
			redirect("/login");
		}

		redirect("/401");
	}

	if (context.status !== "active") {
		forbidden();
	}

	// Passing both exactRole and minRole simultaneously is a caller error — exactRole takes precedence.
	if (options.exactRole && options.minRole) {
		console.warn("[requireRole] exactRole and minRole were both supplied; exactRole takes precedence.");
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

	// minRole: "user" is the baseline authenticated role and is always satisfied at this point.
	// It is documented here intentionally — passing minRole: "user" is a no-op beyond requiring
	// the user to be authenticated (which is enforced above by the !context check).

	return context;
}
