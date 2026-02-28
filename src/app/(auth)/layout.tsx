import { SiteShell } from "@/components/layout/site-shell";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<SiteShell>
			<div className="mx-auto max-w-xl">{children}</div>
		</SiteShell>
	);
}
