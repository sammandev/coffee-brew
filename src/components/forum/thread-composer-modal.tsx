"use client";

import { useState } from "react";
import { ThreadComposer } from "@/components/forum/thread-composer";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";

interface ThreadComposerModalProps {
	description: string;
	title: string;
	triggerLabel: string;
}

export function ThreadComposerModal({ description, title, triggerLabel }: ThreadComposerModalProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button type="button" size="sm" onClick={() => setOpen(true)}>
				{triggerLabel}
			</Button>
			<FormModal
				open={open}
				onClose={() => setOpen(false)}
				title={title}
				description={description}
				allowFullscreen
				defaultFullscreen
			>
				<ThreadComposer hideTitle onSubmitted={() => setOpen(false)} />
			</FormModal>
		</>
	);
}
