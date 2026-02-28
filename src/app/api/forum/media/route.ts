import { apiError, apiOk } from "@/lib/api";
import { requirePermission } from "@/lib/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const FORUM_MEDIA_BUCKET = "forum-media";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
	const permission = await requirePermission("forum", "create");
	if (permission.response) return permission.response;

	const formData = await request.formData().catch(() => null);
	if (!formData) {
		return apiError("Invalid upload request", 400);
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return apiError("File is required", 400);
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return apiError("Unsupported media type", 400, "Allowed types: jpg, png, webp.");
	}

	if (file.size > MAX_SIZE) {
		return apiError("File is too large", 400, "Maximum size is 5MB.");
	}

	const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
	const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
	const storagePath = `${permission.context.userId}/${new Date().toISOString().slice(0, 10)}/${fileName}`;

	const supabase = createSupabaseAdminClient();
	const buffer = Buffer.from(await file.arrayBuffer());

	const { error: uploadError } = await supabase.storage.from(FORUM_MEDIA_BUCKET).upload(storagePath, buffer, {
		contentType: file.type,
		upsert: false,
	});
	if (uploadError) {
		return apiError("Could not upload media", 400, uploadError.message);
	}

	const { data: publicUrlData } = supabase.storage.from(FORUM_MEDIA_BUCKET).getPublicUrl(storagePath);
	const publicUrl = publicUrlData.publicUrl;

	const threadIdRaw = formData.get("threadId");
	const commentIdRaw = formData.get("commentId");
	const threadId = typeof threadIdRaw === "string" && threadIdRaw.trim().length > 0 ? threadIdRaw : null;
	const commentId = typeof commentIdRaw === "string" && commentIdRaw.trim().length > 0 ? commentIdRaw : null;

	await supabase.from("forum_media_assets").insert({
		author_id: permission.context.userId,
		thread_id: threadId,
		comment_id: commentId,
		mime_type: file.type,
		storage_path: storagePath,
		public_url: publicUrl,
		metadata: {
			size: file.size,
			name: file.name,
		},
	});

	return apiOk({ asset_id: storagePath, image_url: publicUrl, url: publicUrl }, 201);
}
