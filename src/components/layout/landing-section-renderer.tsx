import Image from "next/image";
import Link from "next/link";
import { resolveLocalizedConfig, resolveLocalizedText } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/types";
import type { LandingSection } from "@/lib/types";

interface LandingSectionRendererProps {
	section: LandingSection;
	locale: Locale;
	eagerImage?: boolean;
}

export function LandingSectionRenderer({ section, locale, eagerImage = false }: LandingSectionRendererProps) {
	const title = resolveLocalizedText(locale, section.title, section.title_id);
	const subtitle = resolveLocalizedText(locale, section.subtitle, section.subtitle_id);
	const body = resolveLocalizedText(locale, section.body, section.body_id);
	const mergedConfig = resolveLocalizedConfig(locale, section.config, section.config_id);

	const ctaText = typeof mergedConfig.ctaText === "string" ? mergedConfig.ctaText : null;
	const ctaLink = typeof mergedConfig.ctaLink === "string" ? mergedConfig.ctaLink : null;
	const assetUrl = typeof mergedConfig.assetUrl === "string" ? mergedConfig.assetUrl : null;
	const assetAlt = typeof mergedConfig.assetAlt === "string" ? mergedConfig.assetAlt : "Coffee visual";

	if (section.section_type === "hero") {
		return (
			<section className="relative overflow-hidden rounded-4xl border border-(--sand)/40 bg-linear-to-br from-[color-mix(in_oklab,var(--crema)_32%,var(--surface))] via-[color-mix(in_oklab,var(--surface)_88%,var(--crema))] to-[color-mix(in_oklab,var(--sand)_30%,var(--surface))] px-8 pb-12 pt-14 shadow-[0_40px_80px_-40px_var(--overlay)] sm:px-14 sm:pb-16 sm:pt-20">
				{/* Decorative circles */}
				<div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-(--crema)/8 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-(--moss)/6 blur-3xl" />

				<div className="relative">
					<p className="mb-3 inline-flex items-center gap-2 rounded-full border border-(--sand)/50 bg-(--surface)/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-(--muted) backdrop-blur-sm">
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-(--moss)" />
						Coffee Brew Lab
					</p>
					<h1 className="font-heading text-4xl leading-[1.1] tracking-tight text-(--espresso) sm:text-5xl lg:text-6xl">
						{title}
					</h1>
					{subtitle && (
						<p className="mt-5 max-w-2xl text-lg leading-relaxed text-(--foreground)/80 sm:text-xl">{subtitle}</p>
					)}
					{ctaText && ctaLink && (
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<Link
								href={ctaLink}
								className="inline-flex items-center gap-2 rounded-full bg-(--espresso) px-7 py-3.5 text-sm font-semibold text-(--surface-elevated) shadow-lg shadow-(--espresso)/20 transition hover:shadow-xl hover:shadow-(--espresso)/30 hover:brightness-110"
							>
								{ctaText}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="M5 12h14" />
									<path d="m12 5 7 7-7 7" />
								</svg>
							</Link>
						</div>
					)}
				</div>
			</section>
		);
	}

	if (section.section_type === "stats") {
		const items = Array.isArray(mergedConfig.items) ? mergedConfig.items : [];
		return (
			<section className="rounded-3xl border border-(--sand)/30 bg-(--surface-elevated) p-6 sm:p-8">
				{title && <h2 className="mb-6 text-center font-heading text-2xl text-(--espresso)">{title}</h2>}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{(items as Array<{ label: string; label_id?: string; value: string }>).map((item) => (
						<article
							key={`${item.label}-${item.value}`}
							className="group relative overflow-hidden rounded-2xl border border-(--sand)/30 bg-(--surface) p-6 text-center transition hover:border-(--accent)/30 hover:shadow-md"
						>
							<div className="pointer-events-none absolute inset-0 bg-linear-to-br from-(--accent)/3 to-transparent opacity-0 transition group-hover:opacity-100" />
							<p className="relative font-heading text-4xl tracking-tight text-(--espresso)">{item.value}</p>
							<p className="relative mt-1 text-sm text-(--muted)">
								{locale === "id" && item.label_id ? item.label_id : item.label}
							</p>
						</article>
					))}
				</div>
			</section>
		);
	}

	// Generic section: feature_grid, testimonial, CTA, custom
	return (
		<section className="group overflow-hidden rounded-3xl border border-(--sand)/30 bg-(--surface-elevated) transition">
			{assetUrl && (
				<div className="relative h-60 w-full overflow-hidden sm:h-72">
					<Image
						src={assetUrl}
						alt={assetAlt}
						fill
						sizes="(max-width: 1024px) 100vw, 960px"
						loading={eagerImage ? "eager" : "lazy"}
						fetchPriority={eagerImage ? "high" : "auto"}
						className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
					/>
					<div className="absolute inset-0 bg-linear-to-t from-(--surface-elevated) via-(--surface-elevated)/20 to-transparent" />
				</div>
			)}
			<div className={assetUrl ? "-mt-10 relative px-8 pb-8" : "p-8"}>
				<h2 className="font-heading text-3xl tracking-tight text-(--espresso)">{title}</h2>
				{subtitle && <p className="mt-2 text-(--muted)">{subtitle}</p>}
				{body && <p className="mt-4 whitespace-pre-wrap leading-relaxed text-(--foreground)/85">{body}</p>}
				{ctaText && ctaLink && (
					<Link
						href={ctaLink}
						className="mt-6 inline-flex items-center gap-2 rounded-full border border-(--accent)/60 px-5 py-2.5 text-sm font-semibold text-(--accent) transition hover:bg-(--accent) hover:text-(--surface-elevated)"
					>
						{ctaText}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12h14" />
							<path d="m12 5 7 7-7 7" />
						</svg>
					</Link>
				)}
			</div>
		</section>
	);
}
