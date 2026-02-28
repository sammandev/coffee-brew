"use client";

import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface DeleteModalProps {
	confirmLabel?: string;
	description: string;
	isSubmitting?: boolean;
	onClose: () => void;
	onConfirm: () => void;
	open: boolean;
	title: string;
}

export function DeleteModal({
	confirmLabel = "Delete",
	description,
	isSubmitting = false,
	onClose,
	onConfirm,
	open,
	title,
}: DeleteModalProps) {
	return (
		<Modal
			open={open}
			layer="critical"
			onClose={isSubmitting ? () => {} : onClose}
			closeOnOverlayClick={!isSubmitting}
			className="max-w-lg"
		>
			<div className="space-y-6 p-5 sm:p-6">
				<div className="flex items-start gap-3">
					<span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--danger)/18 text-(--danger)">
						<AlertOctagon size={16} />
					</span>
					<div className="flex-1">
						<h2 className="font-heading text-2xl text-(--espresso)">{title}</h2>
						<p className="mt-2 text-sm text-(--muted)">{description}</p>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="button" variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
						{isSubmitting ? "Deleting..." : confirmLabel}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
