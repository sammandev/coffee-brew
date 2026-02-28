import { apiError, apiOk } from "@/lib/api";
import { BLOG_IMAGE_BUCKET, toManagedBlogImagePath } from "@/lib/blog-images";
import { requirePermission } from "@/lib/guards";
import { sanitizeForStorage, validatePlainTextLength } from "@/lib/rich-text";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("landing", "read");
	if (permission.response) return permission.response;

	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();

	if (error) {
		return apiError("Could not fetch blog post", 400, error.message);
	}

	if (!data) {
		return apiError("Blog post not found", 404);
	}

	return apiOk({ post: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("landing", "update");
	if (permission.response) return permission.response;

	const { id } = await params;
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

	const publishedAt =
		parsed.data.status === "published"
			? (parsed.data.published_at ?? new Date().toISOString())
			: (parsed.data.published_at ?? null);

	const supabase = await createSupabaseServerClient();
	const { data: existingPost } = await supabase.from("blog_posts").select("hero_image_url").eq("id", id).maybeSingle();
	const previousHeroImageUrl = existingPost?.hero_image_url ?? null;
	const { data, error } = await supabase
		.from("blog_posts")
		.update({
			...parsed.data,
			published_at: publishedAt,
			editor_id: permission.context.userId,
		})
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		return apiError("Could not update blog post", 400, error.message);
	}

	if (previousHeroImageUrl && previousHeroImageUrl !== data.hero_image_url) {
		const previousPath = toManagedBlogImagePath(previousHeroImageUrl);
		if (previousPath) {
			await createSupabaseAdminClient().storage.from(BLOG_IMAGE_BUCKET).remove([previousPath]);
		}
	}

	return apiOk({ post: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const permission = await requirePermission("landing", "delete");
	if (permission.response) return permission.response;

	const { id } = await params;
	const supabase = await createSupabaseServerClient();
	const { data: existingPost } = await supabase.from("blog_posts").select("hero_image_url").eq("id", id).maybeSingle();
	const { error } = await supabase.from("blog_posts").delete().eq("id", id);

	if (error) {
		return apiError("Could not delete blog post", 400, error.message);
	}

	const previousPath = toManagedBlogImagePath(existingPost?.hero_image_url ?? null);
	if (previousPath) {
		await createSupabaseAdminClient().storage.from(BLOG_IMAGE_BUCKET).remove([previousPath]);
	}

	return apiOk({ success: true });
}
