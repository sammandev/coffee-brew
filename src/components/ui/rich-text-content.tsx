import { sanitizeForRender } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

interface RichTextContentProps {
	className?: string;
	html: string | null | undefined;
}

export function RichTextContent({ className, html }: RichTextContentProps) {
	const safeHtml = sanitizeForRender(html);

	if (!safeHtml) {
		return null;
	}

	return (
		<div
			className={cn(
				"space-y-2 text-sm text-(--foreground)/90 [&_a]:text-(--accent) [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-(--border) [&_blockquote]:pl-3 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-xl [&_li]:ml-4 [&_ol]:list-decimal [&_p]:leading-relaxed [&_ul]:list-disc [&_video]:max-h-104 [&_video]:w-full [&_video]:rounded-xl [&_video]:border",
				className,
			)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized by sanitizeForRender before rendering.
			dangerouslySetInnerHTML={{ __html: safeHtml }}
		/>
	);
}
