"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
	ariaLabelledBy?: string;
	backdropClassName?: string;
	children: React.ReactNode;
	className?: string;
	closeOnOverlayClick?: boolean;
	fullscreen?: boolean;
	layer?: "critical" | "default";
	onClose: () => void;
	open: boolean;
}

function getFocusableNodes(root: HTMLElement | null) {
	if (!root) return [] as HTMLElement[];
	return Array.from(
		root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
	).filter((node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true");
}

export function Modal({
	ariaLabelledBy,
	backdropClassName,
	children,
	className,
	closeOnOverlayClick = true,
	fullscreen = false,
	layer = "default",
	onClose,
	open,
}: ModalProps) {
	const [mounted, setMounted] = React.useState(false);
	const panelRef = React.useRef<HTMLDivElement>(null);
	const previousFocusedRef = React.useRef<HTMLElement | null>(null);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	React.useEffect(() => {
		if (!open || !mounted) return;

		previousFocusedRef.current = document.activeElement as HTMLElement | null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const focusables = getFocusableNodes(panelRef.current);
		focusables[0]?.focus();

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
				return;
			}

			if (event.key !== "Tab") {
				return;
			}

			const nodes = getFocusableNodes(panelRef.current);
			if (nodes.length === 0) {
				event.preventDefault();
				return;
			}

			const first = nodes[0];
			const last = nodes[nodes.length - 1];
			const active = document.activeElement as HTMLElement | null;

			if (event.shiftKey && active === first) {
				event.preventDefault();
				last.focus();
				return;
			}

			if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = previousOverflow;
			previousFocusedRef.current?.focus();
		};
	}, [mounted, onClose, open]);

	if (!mounted || !open) {
		return null;
	}

	const layerClass = layer === "critical" ? "z-[300]" : "z-[120]";
	const panelLayerClass = layer === "critical" ? "z-[301]" : "z-[121]";

	return createPortal(
		<div className={cn("fixed inset-0 flex items-center justify-center", fullscreen ? "p-0" : "p-4 sm:p-6", layerClass)}>
			<button
				type="button"
				className={cn("absolute inset-0 bg-(--overlay)/45", backdropClassName)}
				aria-label="Close modal"
				onClick={() => {
					if (closeOnOverlayClick) {
						onClose();
					}
				}}
			/>

			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={ariaLabelledBy}
				className={cn(
					"relative w-full animate-[fade-up_0.2s_ease-out] overflow-hidden bg-(--surface-elevated) shadow-[0_24px_64px_-36px_var(--overlay)]",
					fullscreen
						? "h-screen max-h-none max-w-none rounded-none border-0"
						: "max-h-[calc(100dvh-2rem)] rounded-3xl border border-(--border) sm:max-h-[calc(100dvh-3rem)]",
					panelLayerClass,
					className,
				)}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}
