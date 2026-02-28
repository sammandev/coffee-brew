import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
	return (
		<textarea
			ref={ref}
			className={cn(
				"min-h-28 w-full rounded-2xl border bg-(--surface) px-4 py-3 text-sm text-foreground placeholder:text-(--muted)/80 focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--accent)/25",
				className,
			)}
			{...props}
		/>
	);
});

Textarea.displayName = "Textarea";

export { Textarea };
