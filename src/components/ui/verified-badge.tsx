import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
	className?: string;
	iconClassName?: string;
	label?: string;
	showLabel?: boolean;
	title?: string;
}

export function VerifiedBadge({
	className,
	iconClassName,
	label = "Verified",
	showLabel = false,
	title = "Verified user",
}: VerifiedBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700",
				className,
			)}
			title={title}
		>
			<BadgeCheck aria-hidden="true" className={cn("h-3 w-3", iconClassName)} strokeWidth={2} />
			{showLabel ? null : <span className="sr-only">{title}</span>}
			{showLabel ? <span>{label}</span> : null}
		</span>
	);
}
