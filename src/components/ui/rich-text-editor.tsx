"use client";

import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Eraser, Italic, Link2, List, ListOrdered, Quote, Underline as UnderlineIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toPlainText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
	className?: string;
	disabled?: boolean;
	id?: string;
	maxPlainTextLength?: number;
	minPlainTextLength?: number;
	name?: string;
	onChange: (value: string) => void;
	value: string;
}

function isActiveClass(active: boolean) {
	return active ? "bg-[var(--sand)]/30" : "";
}

export function RichTextEditor({
	className,
	disabled = false,
	id,
	maxPlainTextLength,
	minPlainTextLength = 0,
	name,
	onChange,
	value,
}: RichTextEditorProps) {
	const [linkInputOpen, setLinkInputOpen] = useState(false);
	const [linkValue, setLinkValue] = useState("");

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				codeBlock: false,
				heading: false,
				horizontalRule: false,
			}),
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
	const showLengthError =
		plainTextLength > 0 &&
		(plainTextLength < minPlainTextLength || (maxPlainTextLength ? plainTextLength > maxPlainTextLength : false));

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
			<div className="flex flex-wrap items-center gap-1 rounded-2xl border bg-(--surface) p-2">
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className={cn("h-8 px-3", isActiveClass(Boolean(editor?.isActive("bold"))))}
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
					className={cn("h-8 px-3", isActiveClass(Boolean(editor?.isActive("italic"))))}
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
					className={cn("h-8 px-3", isActiveClass(Boolean(editor?.isActive("underline"))))}
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
					className={cn("h-8 px-3", isActiveClass(Boolean(editor?.isActive("bulletList"))))}
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
					className={cn("h-8 px-3", isActiveClass(Boolean(editor?.isActive("orderedList"))))}
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
					className={cn("h-8 px-3", isActiveClass(Boolean(editor?.isActive("blockquote"))))}
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
					className={cn("h-8 px-3", isActiveClass(Boolean(editor?.isActive("link"))))}
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
					className="h-8 px-3"
					onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
					disabled={disabled || !editor}
					aria-label="Clear formatting"
				>
					<Eraser size={14} />
				</Button>
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

			<div className="rounded-2xl border bg-(--surface)">
				<EditorContent
					id={id}
					editor={editor}
					className="min-h-32 px-4 py-3 text-sm text-foreground focus-within:ring-2 focus-within:ring-(--accent)/20 [&_.ProseMirror]:min-h-24 [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-[var(--accent)] [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-[var(--border)] [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_li]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ul]:list-disc"
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
