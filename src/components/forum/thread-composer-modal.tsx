"use client";

import { useEffect, useId, useState } from "react";
import { ThreadComposer } from "@/components/forum/thread-composer";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
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
	const { t } = useAppPreferences();
	const [open, setOpen] = useState(false);
	const [composerState, setComposerState] = useState({ isSubmitting: false, canSubmit: false });
	const formId = useId();

	useEffect(() => {
		if (!openOnMount) return;
		setOpen(true);
	}, [openOnMount]);

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
				closeDisabled={composerState.isSubmitting}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={composerState.isSubmitting}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" form={formId} disabled={!composerState.canSubmit}>
							{composerState.isSubmitting ? t("forum.posting") : t("forum.postThread")}
						</Button>
					</div>
				}
			>
				<ThreadComposer
					formId={formId}
					hideTitle
					variant="embedded"
					showSubmitButton={false}
					initialTitle={initialTitle}
					initialContent={initialContent}
					initialTags={initialTags}
					subforums={subforums}
					initialSubforumId={initialSubforumId}
					onStateChange={setComposerState}
					onSubmitted={() => setOpen(false)}
				/>
			</FormModal>
		</>
	);
}
