import { apiError, apiOk } from "@/lib/api";
import { requireSessionContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TAB_ICON_BUCKET } from "@/lib/tab-icons";

const MAX_TAB_ICON_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
	"image/png",
	"image/webp",
	"image/svg+xml",
	"image/x-icon",
	"image/vnd.microsoft.icon",
]);

function resolveExtension(fileName: string, mimeType: string) {
	const explicit = fileName.split(".").pop()?.toLowerCase();
	if (explicit && explicit.length <= 8) {
		return explicit;
	}

	if (mimeType === "image/svg+xml") return "svg";
	if (mimeType === "image/png") return "png";
	if (mimeType === "image/webp") return "webp";
	return "ico";
}

export async function POST(request: Request) {
	const session = await requireSessionContext().catch(() => null);
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	if (session.role !== "superuser") {
		return apiError("Forbidden", 403);
	}

	const formData = await request.formData().catch(() => null);
	const file = formData?.get("file");

	if (!(file instanceof File)) {
		return apiError("Icon file is required", 400);
	}

	if (file.size > MAX_TAB_ICON_SIZE_BYTES) {
		return apiError("Icon file is too large", 400, "Maximum file size is 2MB.");
	}

	if (!ALLOWED_MIME_TYPES.has(file.type)) {
		return apiError("Unsupported icon type", 400, "Allowed formats: PNG, WEBP, SVG, ICO.");
	}

	const extension = resolveExtension(file.name, file.type);
	const filePath = `${session.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
	const storage = createSupabaseAdminClient().storage.from(TAB_ICON_BUCKET);

	const { error: uploadError } = await storage.upload(filePath, file, {
		cacheControl: "3600",
		contentType: file.type,
		upsert: true,
	});

	if (uploadError) {
		return apiError("Could not upload tab icon", 400, uploadError.message);
	}

	const { data: publicUrlData } = storage.getPublicUrl(filePath);
	return apiOk(
		{
			tab_icon_url: publicUrlData.publicUrl,
			tab_icon_storage_path: filePath,
		},
		201,
	);
}
