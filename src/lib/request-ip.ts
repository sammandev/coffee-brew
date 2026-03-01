type HeaderLike = {
	get(name: string): string | null;
};

export function getRequestIp(headers: HeaderLike) {
	const forwardedFor = headers.get("x-forwarded-for");
	if (forwardedFor) {
		const firstHop = forwardedFor.split(",")[0]?.trim();
		if (firstHop) return firstHop;
	}

	const realIp = headers.get("x-real-ip")?.trim();
	if (realIp) return realIp;

	const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
	if (cfConnectingIp) return cfConnectingIp;

	return "unknown";
}
