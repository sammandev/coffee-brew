import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BLOG_MEDIA_BUCKET = "blog-media";
const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/gif", "video/webm", "video/mp4"] as const;

function extensionFromMimeType(mimeType: string) {
	switch (mimeType) {
		case "image/gif":
			return "gif";
		case "video/webm":
			return "webm";
		case "video/mp4":
			return "mp4";
		default:
			return null;
	}
}

async function ensureMediaBucket() {
	const supabase = createSupabaseAdminClient();
	const bucketResult = await supabase.storage.getBucket(BLOG_MEDIA_BUCKET);
	if (bucketResult.data && !bucketResult.error) {
		return { ok: true as const };
	}

	const createResult = await supabase.storage.createBucket(BLOG_MEDIA_BUCKET, {
		public: true,
		fileSizeLimit: MAX_MEDIA_SIZE_BYTES,
		allowedMimeTypes: [...ALLOWED_MIME_TYPES],
	});

	if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
		return { ok: false as const, error: createResult.error.message };
	}

	return { ok: true as const };
}

export async function POST(request: Request) {
	const permission = await requirePermission("landing", "update");
	if (permission.response) return permission.response;

	const formData = await request.formData().catch(() => null);
	if (!formData) return apiError("Invalid form data", 400);

	const file = formData.get("file");
	if (!(file instanceof File)) return apiError("Media file is required", 400);
	if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
		return apiError("Media format must be GIF, WebM, or MP4", 400);
	}
	if (file.size > MAX_MEDIA_SIZE_BYTES) {
		return apiError("Media must be smaller than 10MB", 400);
	}

	const extension = extensionFromMimeType(file.type);
	if (!extension) return apiError("Unsupported media format", 400);

	const bucketReady = await ensureMediaBucket();
	if (!bucketReady.ok) {
		return apiError("Could not prepare blog media storage", 500, bucketReady.error);
	}

	const supabase = createSupabaseAdminClient();
	const storagePath = `${permission.context.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
	const uploadResult = await supabase.storage.from(BLOG_MEDIA_BUCKET).upload(storagePath, file, {
		contentType: file.type,
		upsert: false,
	});

	if (uploadResult.error) {
		return apiError("Could not upload blog media", 400, uploadResult.error.message);
	}

	const {
		data: { publicUrl },
	} = supabase.storage.from(BLOG_MEDIA_BUCKET).getPublicUrl(storagePath);

	return apiOk(
		{
			media_url: publicUrl,
			url: publicUrl,
			storage_path: storagePath,
			mime_type: file.type,
			size_bytes: file.size,
		},
		201,
	);
}
