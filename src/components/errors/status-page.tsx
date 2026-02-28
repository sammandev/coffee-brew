import Image from "next/image";
import Link from "next/link";

interface StatusPageProps {
	code: 401 | 403 | 404 | 500 | 503;
	description: string;
	illustrationPath: string;
	primaryActionHref: string;
	primaryActionLabel: string;
	secondaryActionHref?: string;
	secondaryActionLabel?: string;
	title: string;
}

export function StatusPage({
	code,
	description,
	illustrationPath,
	primaryActionHref,
	primaryActionLabel,
	secondaryActionHref,
	secondaryActionLabel,
	title,
}: StatusPageProps) {
	return (
		<div className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-10">
			<div className="w-full rounded-3xl border bg-(--surface-elevated) p-6 text-center sm:p-8">
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--muted)">{code}</p>
				<h1 className="mt-2 font-heading text-4xl text-(--espresso)">{title}</h1>
				<p className="mx-auto mt-3 max-w-2xl text-sm text-(--muted) sm:text-base">{description}</p>

				<div className="mx-auto mt-6 max-w-xl overflow-hidden rounded-2xl border bg-(--surface)">
					<Image
						src={illustrationPath}
						alt={`${code} illustration`}
						width={960}
						height={540}
						className="h-auto w-full"
						priority
					/>
				</div>

				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					<Link
						href={primaryActionHref}
						className="rounded-full bg-(--espresso) px-5 py-2.5 text-sm font-semibold text-(--surface-elevated)"
					>
						{primaryActionLabel}
					</Link>

					{secondaryActionHref && secondaryActionLabel ? (
						<Link href={secondaryActionHref} className="rounded-full border px-5 py-2.5 text-sm font-semibold">
							{secondaryActionLabel}
						</Link>
					) : null}
				</div>
			</div>
		</div>
	);
}
