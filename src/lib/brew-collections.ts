import { randomBytes } from "node:crypto";

export function generateCollectionShareToken() {
	return randomBytes(24).toString("base64url");
}

export function parseCompareIds(raw: string | null | undefined) {
	const normalized = String(raw ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index)
		.slice(0, 3);
	return normalized;
}
