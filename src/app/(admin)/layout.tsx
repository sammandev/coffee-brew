import { requireRole } from "@/components/auth-guard";
import { SiteShell } from "@/components/layout/site-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	await requireRole({ minRole: "admin" });
	return <SiteShell>{children}</SiteShell>;
}
