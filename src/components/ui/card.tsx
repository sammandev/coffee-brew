import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"rounded-3xl border bg-[var(--surface-elevated)] p-6 shadow-[0_12px_40px_-20px_var(--overlay)]",
				className,
			)}
			{...props}
		/>
	);
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
	return <h3 className={cn("font-heading text-xl text-[var(--espresso)]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
	return <p className={cn("text-sm text-[var(--muted)]", className)} {...props} />;
}
