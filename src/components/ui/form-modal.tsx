"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface FormModalProps {
	allowFullscreen?: boolean;
	children: React.ReactNode;
	closeDisabled?: boolean;
	defaultFullscreen?: boolean;
	description?: string;
	footer?: React.ReactNode;
	maxWidthClassName?: string;
	onClose: () => void;
	open: boolean;
	panelClassName?: string;
	title: string;
}

export function FormModal({
	allowFullscreen = true,
	children,
	closeDisabled = false,
	defaultFullscreen = false,
	description,
	footer,
	maxWidthClassName = "max-w-4xl",
	onClose,
	open,
	panelClassName,
	title,
}: FormModalProps) {
	const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);

	useEffect(() => {
		if (open) {
			setIsFullscreen(defaultFullscreen);
		}
	}, [defaultFullscreen, open]);

	function handleClose() {
		if (!closeDisabled) {
			onClose();
		}
	}

	const shellClassName = isFullscreen
		? "h-screen max-h-none max-w-none rounded-none border-0"
		: `${maxWidthClassName} h-[min(960px,calc(100dvh-2rem))] sm:h-[min(960px,calc(100dvh-3rem))]`;

	return (
		<Modal
			open={open}
			onClose={handleClose}
			closeOnOverlayClick={!closeDisabled}
			fullscreen={isFullscreen}
			className={cn(shellClassName, panelClassName)}
		>
			<div className="flex h-full min-h-0 flex-col">
				<header className="sticky top-0 z-1 border-b border-(--border) bg-(--surface-elevated) px-5 py-4">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<h2 className="font-heading text-2xl text-(--espresso)">{title}</h2>
							{description ? <p className="mt-1 text-sm text-(--muted)">{description}</p> : null}
						</div>
						<div className="flex items-center gap-2">
							{allowFullscreen ? (
								<Button
									type="button"
									size="icon"
									variant="ghost"
									aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
									onClick={() => setIsFullscreen((current) => !current)}
									disabled={closeDisabled}
								>
									{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
								</Button>
							) : null}
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label="Close modal"
								onClick={handleClose}
								disabled={closeDisabled}
							>
								<X size={16} />
							</Button>
						</div>
					</div>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

				{footer ? (
					<footer className="sticky bottom-0 z-1 border-t border-(--border) bg-(--surface-elevated) px-5 py-4">
						{footer}
					</footer>
				) : null}
			</div>
		</Modal>
	);
}
