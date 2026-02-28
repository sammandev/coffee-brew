"use client";

import Image from "next/image";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<div className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-10">
			<div className="w-full rounded-3xl border bg-(--surface-elevated) p-6 text-center sm:p-8">
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--muted)">500</p>
				<h1 className="mt-2 font-heading text-4xl text-(--espresso)">Internal Server Error</h1>
				<p className="mx-auto mt-3 max-w-2xl text-sm text-(--muted) sm:text-base">
					An unexpected error occurred while loading this page.
				</p>

				<div className="mx-auto mt-6 max-w-xl overflow-hidden rounded-2xl border bg-(--surface)">
					<Image src="/errors/500.svg" alt="500 illustration" width={960} height={540} className="h-auto w-full" priority />
				</div>

				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						onClick={reset}
						className="rounded-full bg-(--espresso) px-5 py-2.5 text-sm font-semibold text-(--surface-elevated)"
					>
						Try Again
					</button>
					<Link href="/" className="rounded-full border px-5 py-2.5 text-sm font-semibold">
						Back to Home
					</Link>
				</div>
			</div>
		</div>
	);
}
