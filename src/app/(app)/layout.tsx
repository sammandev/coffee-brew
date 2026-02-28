import { requireRole } from "@/components/auth-guard";
import { SiteShell } from "@/components/layout/site-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	await requireRole();
	return <SiteShell>{children}</SiteShell>;
}
