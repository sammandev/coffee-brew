"use client";

import { useEffect, useState } from "react";
import { ThreadComposer } from "@/components/forum/thread-composer";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";

interface ThreadComposerModalProps {
	description: string;
	initialContent?: string;
	initialTags?: string[];
	initialTitle?: string;
	initialSubforumId?: string;
	openOnMount?: boolean;
	subforums?: Array<{ id: string; name_en: string; name_id: string; slug: string }>;
	title: string;
	triggerLabel: string;
}

export function ThreadComposerModal({
	description,
	initialContent,
	initialTags,
	initialTitle,
	initialSubforumId,
	openOnMount = false,
	subforums,
	title,
	triggerLabel,
}: ThreadComposerModalProps) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!openOnMount) return;
		setOpen(true);
	}, [openOnMount]);

	return (
		<>
			<Button type="button" size="sm" onClick={() => setOpen(true)}>
				{triggerLabel}
			</Button>
			<FormModal open={open} onClose={() => setOpen(false)} title={title} description={description} allowFullscreen>
				<ThreadComposer
					hideTitle
					variant="embedded"
					initialTitle={initialTitle}
					initialContent={initialContent}
					initialTags={initialTags}
					subforums={subforums}
					initialSubforumId={initialSubforumId}
					onSubmitted={() => setOpen(false)}
				/>
			</FormModal>
		</>
	);
}
