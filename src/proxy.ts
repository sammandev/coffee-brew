import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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

function hasSupabaseAuthCookies(request: NextRequest) {
	return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

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

function isStaticPath(pathname: string) {
	if (pathname.startsWith("/_next")) return true;
	if (pathname === "/favicon.ico") return true;
	if (pathname === "/robots.txt") return true;
	if (pathname === "/sitemap.xml") return true;
	return PUBLIC_FILE_PATTERN.test(pathname);
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

	if (process.env.APP_MAINTENANCE_MODE === "true") {
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
