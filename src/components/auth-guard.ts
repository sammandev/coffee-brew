import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function requireRole(options: { minRole?: Role; allowAdmin?: boolean; allowSuperuser?: boolean } = {}) {
	const context = await getSessionContext();

	if (!context) {
		redirect("/login");
	}

	if (context.status !== "active") {
		redirect("/login?reason=blocked");
	}

	if (!options.minRole) {
		return context;
	}

	if (options.minRole === "admin") {
		if (context.role !== "admin" && context.role !== "superuser") {
			redirect("/dashboard");
		}
	}

	if (options.minRole === "superuser" && context.role !== "superuser") {
		redirect("/dashboard");
	}

	return context;
}
