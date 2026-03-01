import { Coffee, Filter, Snowflake } from "lucide-react";
import type { BrewRecommendedMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MethodRecommendationChipsProps {
	className?: string;
	locale: "en" | "id";
	methods?: string[] | null;
}

interface MethodConfig {
	enLabel: string;
	icon: typeof Coffee;
	idLabel: string;
	value: BrewRecommendedMethod;
}

const METHOD_CONFIGS: MethodConfig[] = [
	{ value: "espresso", icon: Coffee, idLabel: "Cocok Espresso", enLabel: "Best for Espresso" },
	{ value: "cold_brew", icon: Snowflake, idLabel: "Bagus Cold Brew", enLabel: "Great for Cold Brew" },
	{ value: "pour_over", icon: Filter, idLabel: "Optimal Pour-Over", enLabel: "Optimized for Pour-Over" },
];

export function MethodRecommendationChips({ className, locale, methods }: MethodRecommendationChipsProps) {
	const active = METHOD_CONFIGS.filter((config) => methods?.includes(config.value));
	if (active.length === 0) return null;

	return (
		<div className={cn("flex flex-wrap gap-1.5", className)}>
			{active.map((config) => {
				const Icon = config.icon;
				const label = locale === "id" ? config.idLabel : config.enLabel;
				return (
					<span
						key={config.value}
						className="inline-flex items-center gap-1 rounded-full border border-(--border) bg-(--surface) px-2.5 py-1 text-[11px] font-semibold text-(--muted)"
					>
						<Icon size={12} />
						{label}
					</span>
				);
			})}
		</div>
	);
}
