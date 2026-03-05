import sanitizeHtml, { type IOptions } from "sanitize-html";

const ALLOWED_TAGS = [
	"p",
	"br",
	"strong",
	"em",
	"u",
	"ul",
	"ol",
	"li",
	"blockquote",
	"a",
	"img",
	"video",
	"figure",
	"figcaption",
	"iframe",
];

const ALLOWED_ATTRIBUTES: IOptions["allowedAttributes"] = {
	a: ["href", "target", "rel"],
	img: ["src", "alt", "width", "height", "loading"],
	video: ["src", "controls", "loop", "muted", "playsinline", "preload", "poster", "class"],
	iframe: ["src", "title", "allow", "allowfullscreen", "frameborder", "width", "height"],
	figure: ["class"],
	figcaption: ["class"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto"];
const YOUTUBE_HOSTS = ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtu.be"];
const TWITTER_HOSTS = ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
const BLOG_MEDIA_PUBLIC_PATH = "/storage/v1/object/public/blog-media/";

const HAS_HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i;

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function normalizeParagraphsFromText(value: string) {
	return value
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
		.join("");
}

function sanitizeRichHtml(value: string) {
	return sanitizeHtml(value, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: ALLOWED_ATTRIBUTES,
		allowedSchemes: ALLOWED_SCHEMES,
		allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"],
		allowedSchemesByTag: {
			a: ALLOWED_SCHEMES,
			img: ["http", "https"],
			video: ["http", "https"],
			iframe: ["http", "https"],
		},
		transformTags: {
			a: sanitizeHtml.simpleTransform("a", {
				target: "_blank",
				rel: "noopener noreferrer nofollow",
			}),
		},
		exclusiveFilter: (frame) => {
			if (frame.tag !== "video") return false;
			const src = frame.attribs.src ?? "";
			if (!src) return true;
			try {
				const url = new URL(src);
				return !url.pathname.includes(BLOG_MEDIA_PUBLIC_PATH);
			} catch {
				return true;
			}
		},
	});
}

// YouTube video IDs are exactly 11 characters: alphanumeric, hyphen, or underscore.
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function toYouTubeEmbedUrl(rawUrl: string) {
	try {
		const url = new URL(rawUrl);
		if (!YOUTUBE_HOSTS.includes(url.hostname)) return null;

		if (url.hostname === "youtu.be") {
			const id = url.pathname.replaceAll("/", "").trim();
			if (!id || !YOUTUBE_VIDEO_ID_PATTERN.test(id)) return null;
			return `https://www.youtube-nocookie.com/embed/${id}`;
		}

		if (url.pathname.startsWith("/embed/")) {
			const id = url.pathname.split("/").filter(Boolean).at(-1);
			if (!id || !YOUTUBE_VIDEO_ID_PATTERN.test(id)) return null;
			return `https://www.youtube-nocookie.com/embed/${id}`;
		}

		const id = url.searchParams.get("v");
		if (!id || !YOUTUBE_VIDEO_ID_PATTERN.test(id)) return null;
		return `https://www.youtube-nocookie.com/embed/${id}`;
	} catch {
		return null;
	}
}

function isTwitterLikeUrl(rawUrl: string) {
	try {
		const url = new URL(rawUrl);
		return TWITTER_HOSTS.includes(url.hostname) && /\/status\/\d+/.test(url.pathname);
	} catch {
		return false;
	}
}

function enhanceEmbeds(value: string) {
	return value.replaceAll(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (match, href, label) => {
		const embedUrl = toYouTubeEmbedUrl(href);
		if (embedUrl) {
			return `<figure class="video-embed"><iframe src="${embedUrl}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen frameborder="0" width="560" height="315"></iframe></figure>`;
		}

		if (isTwitterLikeUrl(href)) {
			return `<blockquote>${label || href}<br /><a href="${href}">${href}</a></blockquote>`;
		}

		return match;
	});
}

export function toPlainText(value: string | null | undefined) {
	if (!value) return "";
	const stripped = sanitizeHtml(value, {
		allowedTags: [],
		allowedAttributes: {},
	});

	return stripped.replace(/\s+/g, " ").trim();
}

/**
 * Shared entry point for both storage and render pipelines.
 * Returns `null` if the input is empty/whitespace so callers can short-circuit.
 * Returns `{ trimmed, isHtml }` otherwise.
 */
function prepareInput(value: string | null | undefined): { trimmed: string; isHtml: boolean } | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return { trimmed, isHtml: HAS_HTML_TAG_PATTERN.test(trimmed) };
}

export function sanitizeForStorage(value: string | null | undefined) {
	const prepared = prepareInput(value);
	if (!prepared) return "";

	if (!prepared.isHtml) {
		const normalized = normalizeParagraphsFromText(prepared.trimmed);
		return toPlainText(normalized).length === 0 ? "" : normalized;
	}

	const sanitized = sanitizeRichHtml(prepared.trimmed);
	return toPlainText(sanitized).length === 0 ? "" : sanitized;
}

export function sanitizeForRender(value: string | null | undefined) {
	const prepared = prepareInput(value);
	if (!prepared) return "";

	if (!prepared.isHtml) {
		const normalized = normalizeParagraphsFromText(prepared.trimmed);
		return toPlainText(normalized).length === 0 ? "" : normalized;
	}

	// Sanitize first so enhanceEmbeds only sees safe, allowlisted content.
	// A second sanitization pass cleans the HTML that enhanceEmbeds generates
	// (iframes, blockquotes) before it reaches the DOM.
	const sanitized = sanitizeRichHtml(prepared.trimmed);
	const withEmbeds = enhanceEmbeds(sanitized);
	const finalSanitized = sanitizeRichHtml(withEmbeds);
	return toPlainText(finalSanitized).length === 0 ? "" : finalSanitized;
}

export function clampPlainText(value: string | null | undefined, length: number) {
	const text = toPlainText(value);
	if (text.length <= length) return text;
	return `${text.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

export function validatePlainTextLength(
	value: string | null | undefined,
	{
		allowEmpty = false,
		max,
		min = 0,
	}: {
		allowEmpty?: boolean;
		max: number;
		min?: number;
	},
) {
	const length = toPlainText(value).length;

	if (!allowEmpty && min > 0 && length < min) {
		return false;
	}

	if (allowEmpty && length === 0) {
		return true;
	}

	return length >= min && length <= max;
}
