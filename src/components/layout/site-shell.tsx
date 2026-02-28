import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export async function SiteShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklab,var(--crema)_20%,transparent)_0%,transparent_32%),linear-gradient(160deg,color-mix(in_oklab,var(--background)_95%,black)_0%,var(--background)_100%)] text-[var(--foreground)]">
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(35deg,color-mix(in_oklab,var(--moss)_12%,transparent),transparent_50%),linear-gradient(145deg,color-mix(in_oklab,var(--espresso)_14%,transparent),transparent_56%)]" />
			<SiteHeader />
			<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
			<SiteFooter />
		</div>
	);
}
