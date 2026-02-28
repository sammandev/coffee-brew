import sanitizeHtml, { type IOptions } from "sanitize-html";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "ul", "ol", "li", "blockquote", "a"];

const ALLOWED_ATTRIBUTES: IOptions["allowedAttributes"] = {
	a: ["href", "target", "rel"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto"];

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
		allowedSchemesByTag: {
			a: ALLOWED_SCHEMES,
		},
		transformTags: {
			a: sanitizeHtml.simpleTransform("a", {
				target: "_blank",
				rel: "noopener noreferrer nofollow",
			}),
		},
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

export function sanitizeForStorage(value: string | null | undefined) {
	if (!value) return "";
	const trimmed = value.trim();
	if (!trimmed) return "";

	if (!HAS_HTML_TAG_PATTERN.test(trimmed)) {
		const normalized = normalizeParagraphsFromText(trimmed);
		return toPlainText(normalized).length === 0 ? "" : normalized;
	}

	const sanitized = sanitizeRichHtml(trimmed);
	return toPlainText(sanitized).length === 0 ? "" : sanitized;
}

export function sanitizeForRender(value: string | null | undefined) {
	if (!value) return "";
	const trimmed = value.trim();
	if (!trimmed) return "";

	if (!HAS_HTML_TAG_PATTERN.test(trimmed)) {
		const normalized = normalizeParagraphsFromText(trimmed);
		return toPlainText(normalized).length === 0 ? "" : normalized;
	}

	const sanitized = sanitizeRichHtml(trimmed);
	return toPlainText(sanitized).length === 0 ? "" : sanitized;
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
