import type { Locale, ThemePreference } from "@/lib/i18n/types";

export type Role = "user" | "admin" | "superuser";

export type PermissionAction =
	| "create"
	| "read"
	| "update"
	| "delete"
	| "moderate"
	| "manage_permissions"
	| "manage_users";

export type ResourceKey = "landing" | "brews" | "catalog" | "forum" | "reviews" | "users" | "rbac";

export type UserStatus = "active" | "blocked" | "disabled";

export type BrewStatus = "draft" | "published" | "hidden";

export type ForumContentStatus = "visible" | "hidden";

export type LandingSectionType = "hero" | "feature_grid" | "stats" | "cta" | "testimonial" | "custom";

export type { Locale, ThemePreference };

export interface BrewInput {
	name: string;
	brewMethod: string;
	coffeeBeans: string;
	brandRoastery: string;
	waterType: string;
	waterPpm: number;
	temperature: number;
	temperatureUnit: "C" | "F";
	grindSize: string;
	grindClicks?: number | null;
	brewTimeSeconds: number;
	brewerName: string;
	notes?: string;
	imageUrl?: string | null;
	imageAlt?: string | null;
	status: BrewStatus;
}

export interface ReviewInput {
	acidity: number;
	sweetness: number;
	body: number;
	aroma: number;
	balance: number;
	notes?: string;
}

export interface PermissionRecord {
	role: Role;
	resource: ResourceKey;
	action: PermissionAction;
}

export interface Profile {
	id: string;
	email: string;
	display_name: string | null;
	avatar_url: string | null;
	status: UserStatus;
}

export interface LandingSection {
	id: string;
	section_type: LandingSectionType;
	title: string;
	title_id: string | null;
	subtitle: string | null;
	subtitle_id: string | null;
	body: string | null;
	body_id: string | null;
	config: Record<string, unknown>;
	config_id: Record<string, unknown>;
	order_index: number;
	is_visible: boolean;
	created_at: string;
	updated_at: string;
}

export interface FaqItem {
	id: string;
	question_en: string;
	answer_en: string;
	question_id: string;
	answer_id: string;
	order_index: number;
	is_visible: boolean;
	created_at: string;
	updated_at: string;
}

export interface Brew extends BrewInput {
	id: string;
	owner_id: string;
	created_at: string;
	updated_at: string;
}

export interface BrewReview extends ReviewInput {
	id: string;
	brew_id: string;
	reviewer_id: string;
	overall: number;
	created_at: string;
	updated_at: string;
}

export interface RatingAggregate {
	overall: number;
	acidity: number;
	sweetness: number;
	body: number;
	aroma: number;
	balance: number;
	total: number;
}

export interface ApiErrorShape {
	error: string;
	details?: string;
}

export interface SiteNavLink {
	href: string;
	label_en: string;
	label_id: string;
	is_visible: boolean;
}

export interface SiteFooterLink {
	group: "sitemap" | "community" | "support";
	href: string;
	label_en: string;
	label_id: string;
	is_visible: boolean;
}

export interface SiteSettings {
	app_name: string;
	tab_title: string;
	home_title_en: string | null;
	home_title_id: string | null;
	home_subtitle_en: string | null;
	home_subtitle_id: string | null;
	navbar_links: SiteNavLink[];
	footer_tagline_en: string;
	footer_tagline_id: string;
	footer_description_en: string;
	footer_description_id: string;
	footer_links: SiteFooterLink[];
	enable_google_login: boolean;
	enable_magic_link_login: boolean;
	enable_signup: boolean;
}

export interface BlogPostRecord {
	id: string;
	slug: string;
	title_en: string;
	title_id: string;
	excerpt_en: string;
	excerpt_id: string;
	body_en: string;
	body_id: string;
	hero_image_url: string;
	hero_image_alt_en: string;
	hero_image_alt_id: string;
	tags: string[];
	reading_time_minutes: number;
	status: "draft" | "published" | "hidden";
	author_id: string | null;
	editor_id: string | null;
	published_at: string | null;
	created_at: string;
	updated_at: string;
}
