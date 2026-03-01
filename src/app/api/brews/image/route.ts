import { apiError, apiOk } from "@/lib/api";
import { BREW_IMAGE_BUCKET } from "@/lib/brew-images";
import { requirePermission } from "@/lib/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function extensionFromMimeType(mimeType: string) {
	switch (mimeType) {
		case "image/jpeg":
			return "jpg";
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
		default:
			return null;
	}
}

async function ensureBrewImageBucket() {
	const supabase = createSupabaseAdminClient();
	const { data, error } = await supabase.storage.getBucket(BREW_IMAGE_BUCKET);
	if (data && !error) {
		return { ok: true as const };
	}

	const createResult = await supabase.storage.createBucket(BREW_IMAGE_BUCKET, {
		public: true,
		fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
		allowedMimeTypes: ALLOWED_MIME_TYPES,
	});

	if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
		return { ok: false as const, error: createResult.error.message };
	}

	return { ok: true as const };
}

export async function POST(request: Request) {
	const permission = await requirePermission("brews", "create");
	if (permission.response) return permission.response;

	const formData = await request.formData().catch(() => null);
	if (!formData) {
		return apiError("Invalid form data", 400);
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return apiError("Image file is required", 400);
	}
	const kindRaw = formData.get("kind");
	const kind = typeof kindRaw === "string" && kindRaw === "grind_reference" ? "grind_reference" : "primary";

	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		return apiError("Image format must be jpeg, png, or webp", 400);
	}

	if (file.size > MAX_IMAGE_SIZE_BYTES) {
		return apiError("Image must be smaller than 5MB", 400);
	}

	const extension = extensionFromMimeType(file.type);
	if (!extension) {
		return apiError("Unsupported image format", 400);
	}

	const bucketResult = await ensureBrewImageBucket();
	if (!bucketResult.ok) {
		return apiError("Could not prepare brew image storage", 500, bucketResult.error);
	}

	const supabase = createSupabaseAdminClient();
	const storagePath = `${permission.context.userId}/${kind}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

	const uploadResult = await supabase.storage.from(BREW_IMAGE_BUCKET).upload(storagePath, file, {
		contentType: file.type,
		upsert: false,
	});

	if (uploadResult.error) {
		return apiError("Could not upload brew image", 400, uploadResult.error.message);
	}

	const {
		data: { publicUrl },
	} = supabase.storage.from(BREW_IMAGE_BUCKET).getPublicUrl(storagePath);

	return apiOk({ image_url: publicUrl, storage_path: storagePath, kind });
}
