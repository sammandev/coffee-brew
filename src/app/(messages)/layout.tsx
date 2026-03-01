import { SiteHeader } from "@/components/layout/site-header";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--crema)_20%,transparent)_0%,transparent_32%),linear-gradient(160deg,color-mix(in_oklab,var(--background)_95%,black)_0%,var(--background)_100%)] text-foreground">
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(35deg,color-mix(in_oklab,var(--moss)_12%,transparent),transparent_50%),linear-gradient(145deg,color-mix(in_oklab,var(--espresso)_14%,transparent),transparent_56%)]" />
			<SiteHeader />
			<main className="mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-7xl flex-1 px-2 py-3 sm:px-4 sm:py-4 lg:px-6">
				{children}
			</main>
		</div>
	);
}
