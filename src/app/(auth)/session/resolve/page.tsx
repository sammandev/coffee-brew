import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

export default async function SessionResolvePage() {
	const context = await getSessionContext();

	if (!context) {
		redirect("/login");
	}

	if (context.status !== "active") {
		redirect("/login?reason=blocked");
	}

	if (context.role === "user") {
		redirect("/me");
	}

	redirect("/dashboard");
}
