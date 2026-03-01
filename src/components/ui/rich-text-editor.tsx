"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AtSign,
	Bold,
	Eraser,
	Film,
	ImagePlus,
	Italic,
	Link2,
	List,
	ListOrdered,
	Loader2,
	Quote,
	Underline as UnderlineIcon,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toPlainText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
	className?: string;
	disabled?: boolean;
	enableImageUpload?: boolean;
	enableMediaUpload?: boolean;
	enableMentions?: boolean;
	id?: string;
	imageUploadEndpoint?: string;
	mediaUploadEndpoint?: string;
	maxPlainTextLength?: number;
	minPlainTextLength?: number;
	name?: string;
	onChange: (value: string) => void;
	value: string;
	variant?: "chat" | "default";
}

const Video = Node.create({
	name: "video",
	group: "block",
	atom: true,
	selectable: true,
	draggable: false,
	addAttributes() {
		return {
			src: { default: null },
			controls: { default: true },
			loop: { default: false },
			muted: { default: true },
			playsinline: { default: true },
		};
	},
	parseHTML() {
		return [{ tag: "video[src]" }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"video",
			mergeAttributes(
				{
					controls: true,
					loop: true,
					muted: true,
					playsinline: true,
					class: "max-h-96 w-full rounded-lg border",
				},
				HTMLAttributes,
			),
		];
	},
});

function isActiveClass(active: boolean) {
	return active ? "bg-[var(--sand)]/30" : "";
}

export function RichTextEditor({
	className,
	disabled = false,
	enableImageUpload = false,
	enableMediaUpload = false,
	enableMentions = false,
	id,
	imageUploadEndpoint = "/api/forum/media",
	mediaUploadEndpoint = "/api/admin/blog/media",
	maxPlainTextLength,
	minPlainTextLength = 0,
	name,
	onChange,
	value,
	variant = "default",
}: RichTextEditorProps) {
	const [linkInputOpen, setLinkInputOpen] = useState(false);
	const [linkValue, setLinkValue] = useState("");
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [isUploadingMedia, setIsUploadingMedia] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const mediaInputRef = useRef<HTMLInputElement>(null);
	const [mentionOpen, setMentionOpen] = useState(false);
	const [mentionQuery, setMentionQuery] = useState("");
	const [mentionLoading, setMentionLoading] = useState(false);
	const [mentionError, setMentionError] = useState<string | null>(null);
	const [mentionResults, setMentionResults] = useState<Array<{ handle: string; label: string }>>([]);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				codeBlock: false,
				heading: false,
				horizontalRule: false,
				link: false,
				underline: false,
			}),
			Image.configure({
				inline: false,
			}),
			Video,
			Underline,
			Link.configure({
				openOnClick: false,
				autolink: true,
				defaultProtocol: "https",
				HTMLAttributes: {
					target: "_blank",
					rel: "noopener noreferrer nofollow",
				},
			}),
		],
		content: value?.trim().length ? value : "<p></p>",
		editable: !disabled,
		immediatelyRender: false,
		onUpdate: ({ editor: currentEditor }) => {
			onChange(currentEditor.getHTML());
		},
	});

	useEffect(() => {
		if (!editor) return;
		editor.setEditable(!disabled);
	}, [disabled, editor]);

	useEffect(() => {
		if (!editor) return;
		const editorHtml = editor.getHTML();
		const nextValue = value?.trim().length ? value : "<p></p>";
		if (editorHtml !== nextValue) {
			editor.commands.setContent(nextValue, { emitUpdate: false });
		}
	}, [editor, value]);

	const plainTextLength = useMemo(() => toPlainText(value).length, [value]);
	const isChatVariant = variant === "chat";
	const toolbarButtonClass = isChatVariant ? "h-7 w-7 p-0" : "h-8 px-3";
	const showLengthError =
		plainTextLength > 0 &&
		(plainTextLength < minPlainTextLength || (maxPlainTextLength ? plainTextLength > maxPlainTextLength : false));

	async function uploadImage(file: File) {
		if (!enableImageUpload || !imageUploadEndpoint) return;
		setIsUploadingImage(true);
		try {
			const formData = new FormData();
			formData.set("file", file);
			const response = await fetch(imageUploadEndpoint, {
				method: "POST",
				body: formData,
			}).catch(() => null);

			if (!response?.ok) {
				setIsUploadingImage(false);
				return;
			}
			const payload = (await response.json().catch(() => ({}))) as { image_url?: string; url?: string };
			const imageUrl = payload.image_url || payload.url;
			if (!imageUrl || !editor) {
				setIsUploadingImage(false);
				return;
			}
			editor.chain().focus().setImage({ src: imageUrl }).run();
		} finally {
			setIsUploadingImage(false);
		}
	}

	async function uploadMedia(file: File) {
		if (!enableMediaUpload || !mediaUploadEndpoint) return;
		setIsUploadingMedia(true);
		try {
			const formData = new FormData();
			formData.set("file", file);
			const response = await fetch(mediaUploadEndpoint, {
				method: "POST",
				body: formData,
			}).catch(() => null);

			if (!response?.ok) {
				setIsUploadingMedia(false);
				return;
			}

			const payload = (await response.json().catch(() => ({}))) as { media_url?: string; url?: string };
			const mediaUrl = payload.media_url || payload.url;
			if (!mediaUrl || !editor) {
				setIsUploadingMedia(false);
				return;
			}

			if (file.type.startsWith("video/")) {
				editor
					.chain()
					.focus()
					.insertContent(`<video src="${mediaUrl}" controls loop muted playsinline preload="metadata"></video><p></p>`)
					.run();
				return;
			}

			editor.chain().focus().setImage({ src: mediaUrl }).run();
		} finally {
			setIsUploadingMedia(false);
		}
	}

	async function searchMentions(nextQuery: string) {
		if (!enableMentions) return;
		const normalized = nextQuery.trim().replace(/^@+/, "");
		setMentionQuery(nextQuery);
		setMentionError(null);
		if (normalized.length < 1) {
			setMentionResults([]);
			return;
		}
		setMentionLoading(true);
		const response = await fetch(`/api/forum/mentions/search?q=${encodeURIComponent(normalized)}`, {
			method: "GET",
		}).catch(() => null);
		if (!response?.ok) {
			setMentionResults([]);
			setMentionLoading(false);
			setMentionError("Could not load mention users.");
			return;
		}
		const payload = (await response.json().catch(() => ({}))) as {
			users?: Array<{ mention_handle?: string; display_name?: string | null; email?: string | null }>;
		};
		const users = payload.users ?? [];
		setMentionResults(
			users
				.map((user) => {
					const handle = user.mention_handle?.trim();
					if (!handle) return null;
					return {
						handle,
						label: user.display_name?.trim() || user.email || handle,
					};
				})
				.filter((item): item is { handle: string; label: string } => Boolean(item)),
		);
		setMentionLoading(false);
	}

	function insertMention(handle: string) {
		if (!editor) return;
		editor.chain().focus().insertContent(`@${handle} `).run();
		setMentionOpen(false);
		setMentionQuery("");
		setMentionResults([]);
	}

	function applyLink() {
		if (!editor) return;
		const href = linkValue.trim();

		if (!href) {
			editor.chain().focus().unsetLink().run();
			setLinkInputOpen(false);
			return;
		}

		editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
		setLinkInputOpen(false);
		setLinkValue("");
	}

	return (
		<div className={cn("grid gap-2", className)}>
			<div
				className={cn(
					"flex items-center gap-1 rounded-2xl border bg-(--surface) p-2",
					isChatVariant ? "flex-nowrap overflow-x-auto" : "flex-wrap",
				)}
			>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn(toolbarButtonClass, isActiveClass(Boolean(editor?.isActive("bold"))))}
					onClick={() => editor?.chain().focus().toggleBold().run()}
					disabled={disabled || !editor}
					aria-label="Bold"
				>
					<Bold size={14} />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn(toolbarButtonClass, isActiveClass(Boolean(editor?.isActive("italic"))))}
					onClick={() => editor?.chain().focus().toggleItalic().run()}
					disabled={disabled || !editor}
					aria-label="Italic"
				>
					<Italic size={14} />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn(toolbarButtonClass, isActiveClass(Boolean(editor?.isActive("underline"))))}
					onClick={() => editor?.chain().focus().toggleUnderline().run()}
					disabled={disabled || !editor}
					aria-label="Underline"
				>
					<UnderlineIcon size={14} />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn(toolbarButtonClass, isActiveClass(Boolean(editor?.isActive("bulletList"))))}
					onClick={() => editor?.chain().focus().toggleBulletList().run()}
					disabled={disabled || !editor}
					aria-label="Bullet list"
				>
					<List size={14} />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn(toolbarButtonClass, isActiveClass(Boolean(editor?.isActive("orderedList"))))}
					onClick={() => editor?.chain().focus().toggleOrderedList().run()}
					disabled={disabled || !editor}
					aria-label="Numbered list"
				>
					<ListOrdered size={14} />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn(toolbarButtonClass, isActiveClass(Boolean(editor?.isActive("blockquote"))))}
					onClick={() => editor?.chain().focus().toggleBlockquote().run()}
					disabled={disabled || !editor}
					aria-label="Quote"
				>
					<Quote size={14} />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn(toolbarButtonClass, isActiveClass(Boolean(editor?.isActive("link"))))}
					onClick={() => {
						if (!editor) return;
						const currentHref = editor.getAttributes("link").href as string | undefined;
						if (editor.isActive("link")) {
							editor.chain().focus().unsetLink().run();
							setLinkInputOpen(false);
							setLinkValue("");
							return;
						}
						setLinkValue(currentHref ?? "");
						setLinkInputOpen(true);
					}}
					disabled={disabled || !editor}
					aria-label="Link"
				>
					<Link2 size={14} />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={toolbarButtonClass}
					onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
					disabled={disabled || !editor}
					aria-label="Clear formatting"
				>
					<Eraser size={14} />
				</Button>
				{enableImageUpload ? (
					<>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className={toolbarButtonClass}
							onClick={() => fileInputRef.current?.click()}
							disabled={disabled || !editor || isUploadingImage}
							aria-label="Upload image"
						>
							{isUploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png,image/jpeg,image/webp"
							className="hidden"
							onChange={(event) => {
								const file = event.currentTarget.files?.[0];
								if (!file) return;
								void uploadImage(file);
								event.currentTarget.value = "";
							}}
						/>
					</>
				) : null}
				{enableMediaUpload ? (
					<>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className={toolbarButtonClass}
							onClick={() => mediaInputRef.current?.click()}
							disabled={disabled || !editor || isUploadingMedia}
							aria-label="Upload media"
						>
							{isUploadingMedia ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
						</Button>
						<input
							ref={mediaInputRef}
							type="file"
							accept="image/gif,video/mp4,video/webm"
							className="hidden"
							onChange={(event) => {
								const file = event.currentTarget.files?.[0];
								if (!file) return;
								void uploadMedia(file);
								event.currentTarget.value = "";
							}}
						/>
					</>
				) : null}
				{enableMentions ? (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className={cn(toolbarButtonClass, mentionOpen && "bg-(--sand)/30")}
						onClick={() => setMentionOpen((current) => !current)}
						disabled={disabled || !editor}
						aria-label="Mention user"
					>
						<AtSign size={14} />
					</Button>
				) : null}
			</div>

			{linkInputOpen && (
				<div className="rounded-2xl border bg-(--surface) p-3">
					<Label htmlFor={`${id ?? name ?? "rich-text"}-link`} className="mb-2 block text-xs">
						Link URL
					</Label>
					<div className="flex items-center gap-2">
						<Input
							id={`${id ?? name ?? "rich-text"}-link`}
							value={linkValue}
							onChange={(event) => setLinkValue(event.currentTarget.value)}
							placeholder="https://"
						/>
						<Button type="button" size="sm" onClick={applyLink}>
							Apply
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => {
								setLinkInputOpen(false);
								setLinkValue("");
							}}
							aria-label="Close link input"
						>
							<X size={14} />
						</Button>
					</div>
				</div>
			)}
			{mentionOpen && enableMentions ? (
				<div className="space-y-2 rounded-2xl border bg-(--surface) p-3">
					<Label htmlFor={`${id ?? name ?? "rich-text"}-mention`} className="block text-xs">
						Mention user
					</Label>
					<Input
						id={`${id ?? name ?? "rich-text"}-mention`}
						value={mentionQuery}
						onChange={(event) => {
							void searchMentions(event.currentTarget.value);
						}}
						placeholder="@username"
					/>
					<div className="max-h-40 space-y-1 overflow-y-auto">
						{mentionLoading ? <p className="text-xs text-(--muted)">Loading...</p> : null}
						{mentionError ? <p className="text-xs text-(--danger)">{mentionError}</p> : null}
						{!mentionLoading &&
							mentionResults.map((result) => (
								<button
									key={result.handle}
									type="button"
									onClick={() => insertMention(result.handle)}
									className="flex w-full items-center justify-between rounded-md border px-2 py-1 text-left text-xs hover:bg-(--sand)/20"
								>
									<span className="font-semibold text-(--espresso)">@{result.handle}</span>
									<span className="text-(--muted)">{result.label}</span>
								</button>
							))}
					</div>
				</div>
			) : null}

			<div className="rounded-2xl border bg-(--surface)">
				<EditorContent
					id={id}
					editor={editor}
					className={cn(
						"text-sm text-foreground focus-within:ring-2 focus-within:ring-(--accent)/20 [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-(--accent) [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-(--border) [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_li]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ul]:list-disc",
						isChatVariant ? "min-h-24 px-3 py-2 [&_.ProseMirror]:min-h-16" : "min-h-32 px-4 py-3 [&_.ProseMirror]:min-h-24",
					)}
				/>
			</div>

			{name ? <input type="hidden" name={name} value={value} /> : null}

			{maxPlainTextLength || minPlainTextLength > 0 ? (
				<p className={cn("text-xs text-(--muted)", showLengthError && "text-(--danger)")}>
					{plainTextLength}
					{maxPlainTextLength ? ` / ${maxPlainTextLength}` : ""}
				</p>
			) : null}
		</div>
	);
}
