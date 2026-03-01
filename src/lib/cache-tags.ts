export const CACHE_TAGS = {
	SITE_SETTINGS: "public:site-settings",
	LANDING: "public:landing",
	FAQ: "public:faq",
	BREWS: "public:brews",
	BREW_DETAIL: "public:brew-detail",
	BLOG: "public:blog",
	FORUM: "public:forum",
} as const;

export type PublicCacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
