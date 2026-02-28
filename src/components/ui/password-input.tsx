"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
	hideLabel?: string;
	showLabel?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
	({ className, disabled, hideLabel = "Hide password", showLabel = "Show password", ...props }, ref) => {
		const [isVisible, setIsVisible] = React.useState(false);

		return (
			<div className="relative">
				<Input
					ref={ref}
					{...props}
					type={isVisible ? "text" : "password"}
					disabled={disabled}
					className={cn("pr-11", className)}
				/>
				<button
					type="button"
					disabled={disabled}
					onClick={() => setIsVisible((current) => !current)}
					aria-label={isVisible ? hideLabel : showLabel}
					aria-pressed={isVisible}
					className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-2xl text-(--muted) transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
				</button>
			</div>
		);
	},
);

PasswordInput.displayName = "PasswordInput";
