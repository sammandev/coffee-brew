export const TAB_ICON_BUCKET = "tab-icons";
export const DEFAULT_TAB_ICON_URL = "/coffee-brew-mark.svg";

export function resolveTabIconUrl(tabIconUrl: string | null | undefined) {
	const value = tabIconUrl?.trim();
	return value && value.length > 0 ? value : DEFAULT_TAB_ICON_URL;
}

export function toManagedTabIconPath(tabIconUrl: string | null | undefined) {
	if (!tabIconUrl) {
		return null;
	}

	try {
		const parsed = new URL(tabIconUrl);
		const marker = `/storage/v1/object/public/${TAB_ICON_BUCKET}/`;
		const markerIndex = parsed.pathname.indexOf(marker);
		if (markerIndex < 0) {
			return null;
		}

		return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
	} catch {
		return null;
	}
}

export function isManagedTabIconUrl(tabIconUrl: string | null | undefined) {
	return toManagedTabIconPath(tabIconUrl) !== null;
}
