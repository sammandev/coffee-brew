import { apiError, apiOk } from "@/lib/api";
import {
	DM_ALLOWED_IMAGE_TYPES,
	DM_IMAGE_MAX_SIZE_BYTES,
	DM_MEDIA_BUCKET,
	extensionFromDmMimeType,
} from "@/lib/direct-messages";
import { isConversationParticipant, requireActiveDmSession } from "@/lib/dm-service";

export async function POST(request: Request) {
	const auth = await requireActiveDmSession();
	if ("response" in auth) return auth.response;
	const { context, supabase } = auth;

	const formData = await request.formData().catch(() => null);
	if (!formData) {
		return apiError("Invalid upload request", 400);
	}

	const conversationIdRaw = formData.get("conversationId");
	const conversationId =
		typeof conversationIdRaw === "string" && conversationIdRaw.trim().length > 0 ? conversationIdRaw.trim() : null;
	if (conversationId) {
		const isParticipant = await isConversationParticipant(supabase, conversationId, context.userId);
		if (!isParticipant) {
			return apiError("Conversation not found", 404);
		}
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return apiError("File is required", 400);
	}
	if (!DM_ALLOWED_IMAGE_TYPES.has(file.type)) {
		return apiError("Unsupported media type", 400, "Allowed types: jpg, png, webp.");
	}
	if (file.size > DM_IMAGE_MAX_SIZE_BYTES) {
		return apiError("File is too large", 400, "Maximum size is 5MB.");
	}

	const ext = extensionFromDmMimeType(file.type);
	const randomPart = Math.random().toString(36).slice(2, 10);
	const fileName = `${Date.now()}-${randomPart}.${ext}`;
	const dateKey = new Date().toISOString().slice(0, 10);
	const storagePath = `${context.userId}/${dateKey}/${fileName}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	const { error: uploadError } = await supabase.storage.from(DM_MEDIA_BUCKET).upload(storagePath, buffer, {
		contentType: file.type,
		upsert: false,
	});
	if (uploadError) {
		return apiError("Could not upload media", 400, uploadError.message);
	}

	const { data: publicUrlData } = supabase.storage.from(DM_MEDIA_BUCKET).getPublicUrl(storagePath);
	return apiOk(
		{
			image_url: publicUrlData.publicUrl,
			public_url: publicUrlData.publicUrl,
			storage_path: storagePath,
			mime_type: file.type,
			size_bytes: file.size,
		},
		201,
	);
}
