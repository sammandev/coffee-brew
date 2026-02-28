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
