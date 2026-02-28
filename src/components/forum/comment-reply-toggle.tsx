"use client";

import { useState } from "react";
import { CommentComposer } from "@/components/forum/comment-composer";
import { Button } from "@/components/ui/button";

interface CommentReplyToggleProps {
	authorName?: string;
	currentUserId?: string;
	hideLabel: string;
	placeholder: string;
	submitLabel: string;
	threadId: string;
	parentCommentId: string;
}

export function CommentReplyToggle({
	authorName,
	currentUserId,
	hideLabel,
	placeholder,
	submitLabel,
	threadId,
	parentCommentId,
}: CommentReplyToggleProps) {
	const [open, setOpen] = useState(false);

	return (
		<div className="space-y-2">
			<Button
				type="button"
				size="sm"
				variant="ghost"
				onClick={() => setOpen((current) => !current)}
				className="h-8 px-3 text-xs"
			>
				{open ? hideLabel : submitLabel}
			</Button>
			{open ? (
				<CommentComposer
					authorName={authorName}
					currentUserId={currentUserId}
					threadId={threadId}
					parentCommentId={parentCommentId}
					placeholder={placeholder}
					submitLabel={submitLabel}
				/>
			) : null}
		</div>
	);
}
