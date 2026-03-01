import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

function resolveSafeNextPath(raw: string | string[] | undefined) {
	const value = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
	const normalized = value.trim();
	if (!normalized.startsWith("/")) return null;
	if (normalized.startsWith("//")) return null;
	if (normalized.startsWith("/session/resolve")) return null;
	return normalized;
}

export default async function SessionResolvePage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const context = await getSessionContext();
	const params = await searchParams;
	const nextPath = resolveSafeNextPath(params.next);

	if (!context) {
		redirect("/login");
	}

	if (context.status !== "active") {
		redirect("/login?reason=blocked");
	}

	if (nextPath) {
		redirect(nextPath);
	}

	if (context.role === "user") {
		redirect("/me");
	}

	redirect("/dashboard");
}
