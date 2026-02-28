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
			<section className="overflow-hidden rounded-4xl border border-(--sand)/60 bg-linear-to-br from-[color-mix(in_oklab,var(--crema)_38%,var(--surface))] via-[color-mix(in_oklab,var(--surface)_90%,var(--crema))] to-[color-mix(in_oklab,var(--sand)_45%,var(--surface))] p-8 shadow-[0_30px_70px_-35px_var(--overlay)] sm:p-12">
				<p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-(--espresso)/70">Coffee Brew Lab</p>
				<h1 className="font-heading text-4xl leading-tight text-(--espresso) sm:text-6xl">{title}</h1>
				{subtitle && <p className="mt-4 max-w-2xl text-lg text-(--foreground)/85">{subtitle}</p>}
				{ctaText && ctaLink && (
					<Link
						href={ctaLink}
						className="mt-8 inline-flex rounded-full bg-(--espresso) px-6 py-3 text-sm font-semibold text-(--surface-elevated) hover:opacity-90"
					>
						{ctaText}
					</Link>
				)}
			</section>
		);
	}

	if (section.section_type === "stats") {
		const items = Array.isArray(mergedConfig.items) ? mergedConfig.items : [];
		return (
			<section className="grid gap-6 rounded-3xl border bg-(--surface-elevated) p-8 sm:grid-cols-2 lg:grid-cols-4">
				<h2 className="sr-only">Stats</h2>
				{(items as Array<{ label: string; label_id?: string; value: string }>).map((item) => (
					<article key={`${item.label}-${item.value}`} className="rounded-2xl border bg-(--surface) p-5">
						<p className="font-heading text-3xl text-(--espresso)">{item.value}</p>
						<p className="text-sm text-(--muted)">{locale === "id" && item.label_id ? item.label_id : item.label}</p>
					</article>
				))}
			</section>
		);
	}

	return (
		<section className="rounded-3xl border bg-(--surface-elevated) p-8">
			{assetUrl && (
				<div className="relative mb-5 h-56 w-full overflow-hidden rounded-2xl">
					<Image
						src={assetUrl}
						alt={assetAlt}
						fill
						sizes="(max-width: 1024px) 100vw, 960px"
						loading={eagerImage ? "eager" : "lazy"}
						fetchPriority={eagerImage ? "high" : "auto"}
						className="object-cover"
					/>
				</div>
			)}
			<h2 className="font-heading text-3xl text-(--espresso)">{title}</h2>
			{subtitle && <p className="mt-2 text-(--muted)">{subtitle}</p>}
			{body && <p className="mt-4 whitespace-pre-wrap text-(--foreground)/88">{body}</p>}
			{ctaText && ctaLink && (
				<Link
					href={ctaLink}
					className="mt-6 inline-flex rounded-full border border-(--accent) px-5 py-2 text-sm font-semibold text-(--accent) hover:bg-(--accent) hover:text-(--surface-elevated)"
				>
					{ctaText}
				</Link>
			)}
		</section>
	);
}
