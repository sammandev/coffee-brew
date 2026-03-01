import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAGIC_BYTES: Record<string, number[][]> = {
	"image/jpeg": [[0xff, 0xd8, 0xff]],
	"image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
	"image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header; full check includes "WEBP" at offset 8
};

function matchesMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
	const signatures = MAGIC_BYTES[mimeType];
	if (!signatures) return false;
	const bytes = new Uint8Array(buffer);
	return signatures.some((sig) => sig.every((byte, i) => bytes[i] === byte));
}

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

function toManagedAvatarPath(avatarUrl: string | null) {
	if (!avatarUrl) {
		return null;
	}

	try {
		const parsed = new URL(avatarUrl);
		const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
		const markerIndex = parsed.pathname.indexOf(marker);
		if (markerIndex < 0) {
			return null;
		}

		return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
	} catch {
		return null;
	}
}

async function ensureAvatarBucket() {
	const supabase = createSupabaseAdminClient();
	const { data, error } = await supabase.storage.getBucket(AVATAR_BUCKET);
	if (data && !error) {
		return { ok: true as const };
	}

	const createResult = await supabase.storage.createBucket(AVATAR_BUCKET, {
		public: true,
		fileSizeLimit: MAX_AVATAR_SIZE_BYTES,
		allowedMimeTypes: ALLOWED_MIME_TYPES,
	});

	if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
		return { ok: false as const, error: createResult.error.message };
	}

	return { ok: true as const };
}

export async function POST(request: Request) {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	if (session.status !== "active") {
		return apiError("Account blocked or disabled", 403);
	}

	const formData = await request.formData().catch(() => null);
	if (!formData) {
		return apiError("Invalid form data", 400);
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return apiError("Avatar file is required", 400);
	}

	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		return apiError("Avatar format must be jpeg, png, or webp", 400);
	}

	if (file.size > MAX_AVATAR_SIZE_BYTES) {
		return apiError("Avatar must be smaller than 2MB", 400);
	}

	const headerBytes = await file.slice(0, 16).arrayBuffer();
	if (!matchesMagicBytes(headerBytes, file.type)) {
		return apiError("File content does not match declared format", 400);
	}

	const extension = extensionFromMimeType(file.type);
	if (!extension) {
		return apiError("Unsupported avatar format", 400);
	}

	const bucketResult = await ensureAvatarBucket();
	if (!bucketResult.ok) {
		return apiError("Could not prepare avatar storage", 500, bucketResult.error);
	}

	const supabase = createSupabaseAdminClient();
	const { data: currentProfile, error: currentProfileError } = await supabase
		.from("profiles")
		.select("avatar_url")
		.eq("id", session.userId)
		.maybeSingle<{ avatar_url: string | null }>();

	if (currentProfileError) {
		return apiError("Could not load profile", 400, currentProfileError.message);
	}

	const storagePath = `${session.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
	const uploadResult = await supabase.storage.from(AVATAR_BUCKET).upload(storagePath, file, {
		contentType: file.type,
		upsert: false,
	});

	if (uploadResult.error) {
		return apiError("Could not upload avatar", 400, uploadResult.error.message);
	}

	const {
		data: { publicUrl },
	} = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);

	const { error: updateError } = await supabase
		.from("profiles")
		.update({ avatar_url: publicUrl })
		.eq("id", session.userId);

	if (updateError) {
		await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);
		return apiError("Could not update profile avatar", 400, updateError.message);
	}

	const previousPath = toManagedAvatarPath(currentProfile?.avatar_url ?? null);
	if (previousPath && previousPath !== storagePath) {
		await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
	}

	return apiOk({ success: true, avatar_url: publicUrl });
}

export async function DELETE() {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	if (session.status !== "active") {
		return apiError("Account blocked or disabled", 403);
	}

	const supabase = createSupabaseAdminClient();
	const { data: currentProfile, error: currentProfileError } = await supabase
		.from("profiles")
		.select("avatar_url")
		.eq("id", session.userId)
		.maybeSingle<{ avatar_url: string | null }>();

	if (currentProfileError) {
		return apiError("Could not load profile", 400, currentProfileError.message);
	}

	const previousPath = toManagedAvatarPath(currentProfile?.avatar_url ?? null);
	if (previousPath) {
		await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
	}

	const { error: updateError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", session.userId);

	if (updateError) {
		return apiError("Could not remove avatar", 400, updateError.message);
	}

	return apiOk({ success: true, avatar_url: null });
}
