type Locale = "en" | "id";

interface BadgeDefinitionLike {
	label_en?: string | null;
	label_id?: string | null;
	min_points?: number | null;
}

interface UserBadgeRowLike {
	user_id?: string | null;
	badge_definitions?: BadgeDefinitionLike | BadgeDefinitionLike[] | null;
}

interface ProfileLike {
	display_name?: string | null;
	email?: string | null;
}

export function resolveUserDisplayName(profile: ProfileLike) {
	const displayName = profile.display_name?.trim();
	if (displayName) return displayName;
	return profile.email ?? "Unknown User";
}

function normalizeBadgeDefinitions(
	definition: BadgeDefinitionLike | BadgeDefinitionLike[] | null | undefined,
): BadgeDefinitionLike[] {
	if (!definition) return [];
	return Array.isArray(definition) ? definition.filter(Boolean) : [definition];
}

function pickBadgeLabel(definition: BadgeDefinitionLike, locale: Locale) {
	const label = locale === "id" ? definition.label_id : definition.label_en;
	return label?.trim() || null;
}

export function buildHighestBadgeMap(rows: UserBadgeRowLike[], locale: Locale) {
	const badgeByUser = new Map<string, { label: string; minPoints: number }>();

	for (const row of rows) {
		const userId = row.user_id?.trim();
		if (!userId) continue;
		const definitions = normalizeBadgeDefinitions(row.badge_definitions);
		for (const definition of definitions) {
			const label = pickBadgeLabel(definition, locale);
			if (!label) continue;
			const minPoints = Number(definition.min_points ?? 0);
			const current = badgeByUser.get(userId);
			if (!current || minPoints > current.minPoints) {
				badgeByUser.set(userId, { label, minPoints });
			}
		}
	}

	return new Map(Array.from(badgeByUser.entries()).map(([userId, badge]) => [userId, badge.label]));
}
