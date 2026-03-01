"use client";

import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
	containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ className, containerClassName, ...props },
	ref,
) {
	return (
		<span className={cn("relative inline-flex h-5 w-5 shrink-0", containerClassName)}>
			<input
				ref={ref}
				type="checkbox"
				className={cn(
					"peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-md border border-(--border) bg-(--surface) transition",
					"before:absolute before:-inset-3 before:content-['']",
					"hover:border-(--accent)/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/40",
					"checked:border-(--espresso) checked:bg-(--espresso)",
					"disabled:cursor-not-allowed disabled:opacity-60",
					className,
				)}
				{...props}
			/>
			<Check className="pointer-events-none absolute inset-0 m-auto size-3 text-(--surface-elevated) opacity-0 transition peer-checked:opacity-100" />
		</span>
	);
});
