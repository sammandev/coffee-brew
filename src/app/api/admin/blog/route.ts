import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { blogPostSchema } from "@/lib/validators";

function sanitizeBlogRichTextFields(body: unknown) {
	if (!body || typeof body !== "object") {
		return body;
	}

	const payload = body as Record<string, unknown>;
	return {
		...payload,
		excerpt_en: sanitizeForStorage(typeof payload.excerpt_en === "string" ? payload.excerpt_en : ""),
		excerpt_id: sanitizeForStorage(typeof payload.excerpt_id === "string" ? payload.excerpt_id : ""),
		body_en: sanitizeForStorage(typeof payload.body_en === "string" ? payload.body_en : ""),
		body_id: sanitizeForStorage(typeof payload.body_id === "string" ? payload.body_id : ""),
	};
}

function validateBlogPlainLengths(payload: {
	body_en: string;
	body_id: string;
	excerpt_en: string;
	excerpt_id: string;
}) {
	if (!validatePlainTextLength(payload.excerpt_en, { min: 3, max: 600 })) {
		return "Excerpt (EN) must be between 3 and 600 characters.";
	}

	if (!validatePlainTextLength(payload.excerpt_id, { min: 3, max: 600 })) {
		return "Excerpt (ID) must be between 3 and 600 characters.";
	}

	if (!validatePlainTextLength(payload.body_en, { min: 10, max: 50000 })) {
		return "Body (EN) must be between 10 and 50000 characters.";
	}

	if (!validatePlainTextLength(payload.body_id, { min: 10, max: 50000 })) {
		return "Body (ID) must be between 10 and 50000 characters.";
	}

	return null;
}

export async function GET() {
	const permission = await requirePermission("landing", "read");
	if (permission.response) return permission.response;

	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("blog_posts")
		.select("*")
		.order("updated_at", { ascending: false })
		.limit(200);

	if (error) {
		return apiError("Could not fetch blog posts", 400, error.message);
	}

	return apiOk({ posts: data });
}

export async function POST(request: Request) {
	const permission = await requirePermission("landing", "update");
	if (permission.response) return permission.response;

	const body = await request.json().catch(() => null);
	const sanitizedBody = sanitizeBlogRichTextFields(body);
	const parsed = blogPostSchema.safeParse(sanitizedBody);

	if (!parsed.success) {
		return apiError("Invalid blog payload", 400, parsed.error.message);
	}

	const plainLengthError = validateBlogPlainLengths(parsed.data);
	if (plainLengthError) {
		return apiError("Invalid blog payload", 400, plainLengthError);
	}

	const supabase = await createSupabaseServerClient();
	const publishedAt =
		parsed.data.status === "published"
			? (parsed.data.published_at ?? new Date().toISOString())
			: (parsed.data.published_at ?? null);

	const { data, error } = await supabase
		.from("blog_posts")
		.insert({
			...parsed.data,
			published_at: publishedAt,
			author_id: permission.context.userId,
			editor_id: permission.context.userId,
		})
		.select("*")
		.single();

	if (error) {
		return apiError("Could not create blog post", 400, error.message);
	}

	return apiOk({ post: data }, 201);
}
