import { sanitizeForStorage, toPlainText } from "@/lib/rich-text";

export const DM_ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const DM_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const DM_MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
export const DM_MEDIA_BUCKET = "dm-media";

export type DmPrivacy = "everyone" | "verified_only" | "nobody";
export type DmConversationView = "active" | "archived";
export type DmReportStatus = "open" | "resolved" | "dismissed";

export function buildDirectMessageKey(userA: string, userB: string) {
	if (userA === userB) return userA;
	return userA < userB ? `${userA}:${userB}` : `${userB}:${userA}`;
}

export function sanitizeDmBody(value: string) {
	return sanitizeForStorage(value);
}

export function normalizeDmBodyText(value: string | null | undefined) {
	return toPlainText(value);
}

export function canEditDmMessage(createdAt: string | Date, now = Date.now()) {
	const createdMs = new Date(createdAt).getTime();
	if (!Number.isFinite(createdMs)) return false;
	return now - createdMs <= DM_MESSAGE_EDIT_WINDOW_MS;
}

export function parseDmStoragePath(url: string | null | undefined) {
	if (!url) return null;

	try {
		const parsed = new URL(url);
		const marker = `/storage/v1/object/public/${DM_MEDIA_BUCKET}/`;
		const index = parsed.pathname.indexOf(marker);
		if (index === -1) return null;
		return parsed.pathname.slice(index + marker.length);
	} catch {
		return null;
	}
}

export function extensionFromDmMimeType(mimeType: string) {
	switch (mimeType) {
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
		default:
			return "jpg";
	}
}

export function isValidDmConversationView(value: string | null | undefined): value is DmConversationView {
	return value === "active" || value === "archived";
}
