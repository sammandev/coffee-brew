import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeEdgeRateLimit } from "@/lib/rate-limit";
import { emitRateLimitConsoleLog } from "@/lib/rate-limit-audit";
import { getRequestIp } from "@/lib/request-ip";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE_PATTERN = /\.(.*)$/;

const EDGE_RATE_LIMIT_RULES = [
	{
		method: "POST",
		path: "/api/auth/prepare-callback",
		limit: 30,
		windowMs: 60 * 1000,
	},
	{
		method: "DELETE",
		path: "/api/profile/account",
		limit: 8,
		windowMs: 15 * 60 * 1000,
	},
] as const;

type EdgeRateLimitRule = (typeof EDGE_RATE_LIMIT_RULES)[number];

const EDGE_RATE_LIMIT_RULES_BY_KEY = new Map<string, EdgeRateLimitRule>(
	EDGE_RATE_LIMIT_RULES.map((rule) => [`${rule.method}:${rule.path}`, rule]),
);

/** Coerce APP_MAINTENANCE_MODE env var ("true"/"1"/true) to boolean. Defaults to false. */
const isMaintenanceMode = z.coerce.boolean().default(false).parse(process.env.APP_MAINTENANCE_MODE);

function hasSupabaseAuthCookies(request: NextRequest) {
	return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

/** Paths that are always served regardless of maintenance mode or rate limiting. */
function isStaticPath(pathname: string) {
	if (pathname.startsWith("/_next")) return true;
	if (pathname === "/favicon.ico") return true;
	if (pathname === "/robots.txt") return true;
	if (pathname === "/sitemap.xml") return true;
	return PUBLIC_FILE_PATTERN.test(pathname);
}

function isMaintenanceBypassPath(pathname: string) {
	if (isStaticPath(pathname)) return true;
	if (pathname === "/503") return true;
	if (pathname.startsWith("/api")) return true;
	if (pathname.startsWith("/health")) return true;
	if (pathname.startsWith("/status")) return true;
	return false;
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	if (!isStaticPath(pathname)) {
		const rule = EDGE_RATE_LIMIT_RULES_BY_KEY.get(`${request.method}:${pathname}`);
		if (rule) {
			const ip = getRequestIp(request.headers);
			const key = `edge:${rule.path}:${rule.method}:${ip}`;
			const result = consumeEdgeRateLimit({
				key,
				limit: rule.limit,
				windowMs: rule.windowMs,
			});

			if (!result.allowed) {
				emitRateLimitConsoleLog({
					source: "edge",
					endpoint: rule.path,
					method: rule.method,
					keyScope: "edge:ip",
					retryAfterSeconds: result.retryAfterSeconds,
					identifier: ip,
				});

				return NextResponse.json(
					{
						error: "Rate limit exceeded",
						details: "Too many requests. Try again shortly.",
					},
					{
						status: 429,
						headers: {
							"Retry-After": String(result.retryAfterSeconds),
						},
					},
				);
			}
		}
	}

	if (isMaintenanceMode) {
		if (!isMaintenanceBypassPath(pathname)) {
			const redirectUrl = request.nextUrl.clone();
			redirectUrl.pathname = "/503";
			redirectUrl.search = "";
			return NextResponse.redirect(redirectUrl);
		}
	}

	if (!hasSupabaseAuthCookies(request)) {
		return NextResponse.next({ request });
	}

	return updateSession(request);
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
