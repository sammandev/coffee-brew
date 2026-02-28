export const BLOG_IMAGE_BUCKET = "blog-images";
export const DEFAULT_BLOG_IMAGE_URL =
	"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80";

export function resolveBlogImageUrl(imageUrl: string | null | undefined) {
	const value = imageUrl?.trim();
	return value && value.length > 0 ? value : DEFAULT_BLOG_IMAGE_URL;
}

export function toManagedBlogImagePath(imageUrl: string | null | undefined) {
	if (!imageUrl) {
		return null;
	}

	try {
		const parsed = new URL(imageUrl);
		const marker = `/storage/v1/object/public/${BLOG_IMAGE_BUCKET}/`;
		const markerIndex = parsed.pathname.indexOf(marker);
		if (markerIndex < 0) {
			return null;
		}

		return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
	} catch {
		return null;
	}
}

export function isManagedBlogImageUrl(imageUrl: string | null | undefined) {
	return toManagedBlogImagePath(imageUrl) !== null;
}
