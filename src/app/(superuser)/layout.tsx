import { requireRole } from "@/components/auth-guard";
import { SiteShell } from "@/components/layout/site-shell";

export default async function SuperuserLayout({ children }: { children: React.ReactNode }) {
	await requireRole({ minRole: "superuser" });
	return <SiteShell>{children}</SiteShell>;
}
