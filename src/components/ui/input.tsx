import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
	return (
		<input
			ref={ref}
			className={cn(
				"h-11 w-full rounded-2xl border bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/80 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25",
				className,
			)}
			{...props}
		/>
	);
});

Input.displayName = "Input";

export { Input };
