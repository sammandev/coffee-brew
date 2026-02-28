import { cn } from "@/lib/utils";

interface GoogleIconProps {
	className?: string;
}

export function GoogleIcon({ className }: GoogleIconProps) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={cn("size-4", className)}>
			<path
				fill="#EA4335"
				d="M12.23 10.2v3.84h5.41c-.22 1.24-.94 2.28-2.02 2.98l3.27 2.54c1.9-1.75 3-4.31 3-7.35 0-.72-.07-1.42-.2-2.1h-9.46Z"
			/>
			<path
				fill="#34A853"
				d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.27-2.54c-.9.6-2.06.95-3.35.95-2.58 0-4.77-1.74-5.55-4.07l-3.38 2.61C4.72 19.79 8.1 22 12 22Z"
			/>
			<path
				fill="#4A90E2"
				d="M6.45 13.9A5.99 5.99 0 0 1 6.14 12c0-.66.12-1.3.31-1.9L3.07 7.49A9.98 9.98 0 0 0 2 12c0 1.61.39 3.12 1.07 4.51l3.38-2.61Z"
			/>
			<path
				fill="#FBBC05"
				d="M12 6.03c1.48 0 2.8.5 3.84 1.48l2.88-2.88C16.96 2.98 14.7 2 12 2 8.1 2 4.72 4.21 3.07 7.49l3.38 2.61C7.23 7.77 9.42 6.03 12 6.03Z"
			/>
		</svg>
	);
}
