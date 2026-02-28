export const BREW_IMAGE_BUCKET = "brew-images";
export const DEFAULT_BREW_IMAGE_URL =
	"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80";

export function resolveBrewImageUrl(imageUrl: string | null | undefined) {
	const value = imageUrl?.trim();
	return value && value.length > 0 ? value : DEFAULT_BREW_IMAGE_URL;
}

export function toManagedBrewImagePath(imageUrl: string | null | undefined) {
	if (!imageUrl) {
		return null;
	}

	try {
		const parsed = new URL(imageUrl);
		const marker = `/storage/v1/object/public/${BREW_IMAGE_BUCKET}/`;
		const markerIndex = parsed.pathname.indexOf(marker);
		if (markerIndex < 0) {
			return null;
		}

		return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
	} catch {
		return null;
	}
}

export function isManagedBrewImageUrl(imageUrl: string | null | undefined) {
	return toManagedBrewImagePath(imageUrl) !== null;
}
