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
	notes: z.string().trim().max(5000).optional(),
	status: z.enum(["draft", "published", "hidden"]).default("draft"),
});

export const reviewSchema = z.object({
	acidity: z.number().int().min(1).max(5),
	sweetness: z.number().int().min(1).max(5),
	body: z.number().int().min(1).max(5),
	aroma: z.number().int().min(1).max(5),
	balance: z.number().int().min(1).max(5),
	notes: z.string().trim().max(2000).optional(),
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
	is_visible: z.boolean().default(true),
});

export const faqItemSchema = z.object({
	question_en: z.string().trim().min(3).max(300),
	answer_en: z.string().trim().min(3).max(5000),
	question_id: z.string().trim().min(3).max(300),
	answer_id: z.string().trim().min(3).max(5000),
	order_index: z.number().int().min(0).max(999).default(0),
	is_visible: z.boolean().default(true),
});

export const forumThreadSchema = z.object({
	title: z.string().trim().min(4).max(180),
	content: z.string().trim().min(4).max(6000),
});

export const forumCommentSchema = z.object({
	content: z.string().trim().min(1).max(3000),
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

export type BrewSchemaInput = z.infer<typeof brewSchema>;
export type ReviewSchemaInput = z.infer<typeof reviewSchema>;
