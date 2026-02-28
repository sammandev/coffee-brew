import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE_PATTERN = /\.(.*)$/;

function isMaintenanceBypassPath(pathname: string) {
	if (pathname === "/503") return true;
	if (pathname.startsWith("/_next")) return true;
	if (pathname.startsWith("/api")) return true;
	if (pathname.startsWith("/health")) return true;
	if (pathname.startsWith("/status")) return true;
	if (pathname === "/favicon.ico") return true;
	if (pathname === "/robots.txt") return true;
	if (pathname === "/sitemap.xml") return true;
	return PUBLIC_FILE_PATTERN.test(pathname);
}

export async function proxy(request: NextRequest) {
	if (process.env.APP_MAINTENANCE_MODE === "true") {
		const { pathname } = request.nextUrl;
		if (!isMaintenanceBypassPath(pathname)) {
			const redirectUrl = request.nextUrl.clone();
			redirectUrl.pathname = "/503";
			redirectUrl.search = "";
			return NextResponse.redirect(redirectUrl);
		}
	}

	return updateSession(request);
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
