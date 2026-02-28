import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center rounded-full text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-40",
	{
		variants: {
			variant: {
				primary: "bg-[var(--espresso)] text-[var(--surface-elevated)] hover:opacity-90",
				secondary: "bg-[var(--crema)] text-[var(--charcoal)] hover:opacity-90",
				ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--sand)]/30",
				outline:
					"border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--surface-elevated)]",
				destructive: "bg-[var(--danger)] text-white hover:opacity-90",
			},
			size: {
				sm: "h-9 px-4",
				md: "h-11 px-5",
				lg: "h-12 px-6",
				icon: "h-11 w-11",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
	return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
