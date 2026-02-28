import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
	// biome-ignore lint/a11y/noLabelWithoutControl: This is a reusable wrapper that receives htmlFor from callers.
	return <label className={cn("mb-2 block text-sm font-semibold text-[var(--espresso)]", className)} {...props} />;
}
