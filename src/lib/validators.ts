import { z } from "zod";
import { FORUM_REACTION_TYPES } from "@/lib/constants";

export const brewSchema = z.object({
	name: z.string().trim().min(2).max(120),
	brewMethod: z.string().trim().min(2).max(80),
	coffeeBeans: z.string().trim().min(2).max(120),
	brandRoastery: z.string().trim().min(2).max(120),
	waterType: z.string().trim().min(2).max(80),
	waterPpm: z.number().int().min(0).max(1000),
	temperature: z.number().min(0).max(120),
	temperatureUnit: z.enum(["C", "F"]).default("C"),
	grindSize: z.string().trim().min(1).max(80),
	grindClicks: z.number().int().min(0).max(200).nullable().optional(),
	brewTimeSeconds: z.number().int().min(10).max(7200),
	brewerName: z.string().trim().min(2).max(120),
	notes: z.string().trim().max(30000).optional(),
	imageUrl: z.string().trim().url().max(2000).nullable().optional(),
	imageAlt: z.string().trim().max(200).nullable().optional(),
	tags: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
	status: z.enum(["draft", "published", "hidden"]).default("draft"),
});

export const reviewSchema = z.object({
	acidity: z.number().int().min(1).max(5),
	sweetness: z.number().int().min(1).max(5),
	body: z.number().int().min(1).max(5),
	aroma: z.number().int().min(1).max(5),
	balance: z.number().int().min(1).max(5),
	notes: z.string().trim().max(15000).optional(),
});

export const localizedConfigSchema = z.record(z.string(), z.unknown()).default({});

export const landingSectionSchema = z.object({
	section_type: z.enum(["hero", "feature_grid", "stats", "cta", "testimonial", "custom"]),
	title: z.string().trim().min(2).max(120),
	title_id: z.string().trim().max(120).nullable().optional(),
	subtitle: z.string().trim().max(240).nullable().optional(),
	subtitle_id: z.string().trim().max(240).nullable().optional(),
	body: z.string().trim().max(4000).nullable().optional(),
	body_id: z.string().trim().max(4000).nullable().optional(),
	config: localizedConfigSchema,
	config_id: localizedConfigSchema.optional(),
	order_index: z.number().int().min(0).max(999),
	is_visible: z.boolean().optional(),
	status: z.enum(["draft", "published", "hidden"]).default("published"),
});

export const faqItemSchema = z.object({
	question_en: z.string().trim().min(3).max(300),
	answer_en: z.string().trim().min(3).max(5000),
	question_id: z.string().trim().min(3).max(300),
	answer_id: z.string().trim().min(3).max(5000),
	order_index: z.number().int().min(0).max(999).default(0),
	is_visible: z.boolean().optional(),
	status: z.enum(["draft", "published", "hidden"]).default("published"),
});

export const forumThreadSchema = z.object({
	title: z.string().trim().min(4).max(180),
	content: z.string().trim().min(4).max(30000),
	tags: z.array(z.string().trim().min(1).max(32)).max(10).optional().default([]),
});

export const forumCommentSchema = z.object({
	content: z.string().trim().min(1).max(15000),
	parentCommentId: z.string().uuid().nullable().optional(),
});

export const forumReactionSchema = z
	.object({
		targetType: z.enum(["thread", "comment"]),
		targetId: z.string().uuid(),
		reaction: z.enum(FORUM_REACTION_TYPES),
	})
	.strict();

export const moderationSchema = z.object({
	targetType: z.enum(["brew", "thread", "comment"]),
	targetId: z.string().uuid(),
	hide: z.boolean(),
	reason: z.string().trim().min(2).max(300).optional(),
});

export const newsletterSubscribeSchema = z.object({
	email: z.string().email(),
	consent: z.literal(true),
	source: z.string().trim().max(100).default("app"),
});

export const newsletterUnsubscribeSchema = z.object({
	email: z.string().email(),
});

export const rbacUpdateSchema = z.object({
	role: z.enum(["user", "admin", "superuser"]),
	permissions: z.array(
		z.object({
			resource: z.enum(["landing", "brews", "catalog", "forum", "reviews", "users", "rbac"]),
			action: z.enum(["create", "read", "update", "delete", "moderate", "manage_permissions", "manage_users"]),
		}),
	),
});

export const userActionSchema = z.object({
	reason: z.string().trim().max(300).optional(),
});

export const blogPostSchema = z.object({
	slug: z
		.string()
		.trim()
		.min(3)
		.max(140)
		.regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, or hyphens"),
	title_en: z.string().trim().min(3).max(180),
	title_id: z.string().trim().min(3).max(180),
	excerpt_en: z.string().trim().min(3).max(6000),
	excerpt_id: z.string().trim().min(3).max(6000),
	body_en: z.string().trim().min(10).max(180000),
	body_id: z.string().trim().min(10).max(180000),
	hero_image_url: z.string().trim().url(),
	hero_image_alt_en: z.string().trim().min(2).max(200),
	hero_image_alt_id: z.string().trim().min(2).max(200),
	tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
	reading_time_minutes: z.number().int().min(1).max(240).default(3),
	status: z.enum(["draft", "published", "hidden"]).default("draft"),
	published_at: z.string().datetime().nullable().optional(),
});

export const siteSettingsSchema = z.object({
	app_name: z.string().trim().min(2).max(80),
	tab_title: z.string().trim().min(2).max(80),
	home_title_en: z.string().trim().max(180).nullable().optional(),
	home_title_id: z.string().trim().max(180).nullable().optional(),
	home_subtitle_en: z.string().trim().max(600).nullable().optional(),
	home_subtitle_id: z.string().trim().max(600).nullable().optional(),
	navbar_links: z
		.array(
			z.object({
				href: z.string().trim().regex(/^\//),
				label_en: z.string().trim().min(1).max(80),
				label_id: z.string().trim().min(1).max(80),
				is_visible: z.boolean(),
			}),
		)
		.max(20),
	footer_tagline_en: z.string().trim().min(2).max(240),
	footer_tagline_id: z.string().trim().min(2).max(240),
	footer_description_en: z.string().trim().min(2).max(400),
	footer_description_id: z.string().trim().min(2).max(400),
	footer_links: z
		.array(
			z.object({
				group: z.enum(["sitemap", "community", "support"]),
				href: z.string().trim().regex(/^\//),
				label_en: z.string().trim().min(1).max(80),
				label_id: z.string().trim().min(1).max(80),
				is_visible: z.boolean(),
			}),
		)
		.max(40),
	enable_google_login: z.boolean(),
	enable_magic_link_login: z.boolean(),
	enable_signup: z.boolean(),
	tab_icon_url: z.string().trim().url().max(2000).nullable().optional(),
	tab_icon_storage_path: z.string().trim().max(400).nullable().optional(),
});

export const profileDisplayNameSchema = z.object({
	display_name: z.string().trim().min(2).max(120),
});

export type BrewSchemaInput = z.infer<typeof brewSchema>;
export type ReviewSchemaInput = z.infer<typeof reviewSchema>;
