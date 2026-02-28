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
export type ContentLifecycleStatus = "draft" | "published" | "hidden";

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
	tags?: string[];
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
	mention_handle: string | null;
	karma_points: number;
	is_verified: boolean;
	verified_at: string | null;
	status: UserStatus;
	is_profile_private: boolean;
	show_online_status: boolean;
	last_active_at: string | null;
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
	status: ContentLifecycleStatus;
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
	status: ContentLifecycleStatus;
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
	tab_icon_url: string | null;
	tab_icon_storage_path: string | null;
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

export interface ForumCategory {
	id: string;
	slug: string;
	name_en: string;
	name_id: string;
	description_en: string | null;
	description_id: string | null;
	order_index: number;
	is_visible: boolean;
	created_at: string;
	updated_at: string;
}

export interface ForumSubforum {
	id: string;
	category_id: string;
	slug: string;
	name_en: string;
	name_id: string;
	description_en: string | null;
	description_id: string | null;
	order_index: number;
	is_visible: boolean;
	created_at: string;
	updated_at: string;
}

export interface ForumThreadRecord {
	id: string;
	author_id: string;
	subforum_id: string;
	title: string;
	content: string;
	tags: string[];
	status: ForumContentStatus;
	slug: string | null;
	is_locked: boolean;
	is_pinned: boolean;
	deleted_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface ForumPollRecord {
	id: string;
	thread_id: string;
	question: string;
	options: string[];
	closes_at: string | null;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface ForumPollVoteRecord {
	id: string;
	poll_id: string;
	user_id: string;
	option_index: number;
	created_at: string;
}

export interface ForumReportRecord {
	id: string;
	reporter_id: string;
	target_type: "thread" | "comment" | "reply";
	target_id: string;
	reason: string;
	detail: string | null;
	status: "open" | "resolved" | "dismissed";
	assignee_id: string | null;
	resolution_note: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
	resolved_at: string | null;
}

export interface ForumDraftRecord {
	id: string;
	user_id: string;
	draft_type: "thread" | "comment";
	subforum_id: string | null;
	thread_id: string | null;
	payload: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

export interface BadgeDefinitionRecord {
	id: string;
	badge_key: string;
	label_en: string;
	label_id: string;
	min_points: number;
	color_hex: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface UserBadgeRecord {
	user_id: string;
	badge_id: string;
	awarded_at: string;
	awarded_by: string | null;
	metadata: Record<string, unknown>;
}
