import { requireRole } from "@/components/auth-guard";
import { SiteShell } from "@/components/layout/site-shell";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
	await requireRole({ exactRole: "user", onUnauthorized: "forbidden" });
	return <SiteShell>{children}</SiteShell>;
}
