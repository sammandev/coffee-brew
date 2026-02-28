import type { ForumReactionType } from "@/lib/constants";
import { FORUM_REACTION_TYPES } from "@/lib/constants";

export function buildForumThreadSlug(value: string) {
	const slug = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 100);
	return slug.length > 0 ? slug : "thread";
}

export function normalizeTagList(value: string[] | null | undefined, max = 10) {
	const unique = new Set<string>();
	for (const item of value ?? []) {
		const normalized = item.trim().toLowerCase();
		if (!normalized) continue;
		if (normalized.length > 32) continue;
		unique.add(normalized);
		if (unique.size >= max) break;
	}
	return Array.from(unique);
}

export function buildReactionCountMap(rows: Array<{ reaction: ForumReactionType }>) {
	const counts = Object.fromEntries(FORUM_REACTION_TYPES.map((reactionType) => [reactionType, 0])) as Record<
		ForumReactionType,
		number
	>;
	for (const row of rows) {
		counts[row.reaction] = (counts[row.reaction] ?? 0) + 1;
	}
	return counts;
}

export function isLikelyUuid(value: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
