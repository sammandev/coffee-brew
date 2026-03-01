import { NextResponse } from "next/server";
import {
	AUTH_CALLBACK_NONCE_COOKIE,
	AUTH_CALLBACK_NONCE_TTL_SECONDS,
	isAuthPrepareFlow,
	normalizeAuthCallbackNextPath,
} from "@/lib/auth-callback";
import { consumeDbRateLimit } from "@/lib/rate-limit";
import { persistRateLimitAuditLog } from "@/lib/rate-limit-audit";
import { getRequestIp } from "@/lib/request-ip";

export async function POST(request: Request) {
	const { origin } = new URL(request.url);
	const requestOrigin = request.headers.get("origin");
	if (requestOrigin && requestOrigin !== origin) {
		return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
	}

	const ip = getRequestIp(request.headers);
	const dbRateLimit = await consumeDbRateLimit({
		key: `db:prepare-callback:ip:${ip}`,
		limit: 120,
		windowMs: 15 * 60 * 1000,
	});

	if (!dbRateLimit.allowed) {
		await persistRateLimitAuditLog({
			source: "db",
			endpoint: "/api/auth/prepare-callback",
			method: "POST",
			keyScope: "db:ip",
			retryAfterSeconds: dbRateLimit.retryAfterSeconds,
			identifier: ip,
		});

		return NextResponse.json(
			{
				error: "Rate limit exceeded",
				details: "Too many callback preparation requests. Try again shortly.",
			},
			{
				status: 429,
				headers: {
					"Retry-After": String(dbRateLimit.retryAfterSeconds),
				},
			},
		);
	}

	const body = await request.json().catch(() => ({}));
	const flow = isAuthPrepareFlow(body?.flow) ? body.flow : "callback";
	const requestedNext = typeof body?.next === "string" ? body.next : null;
	const safePath = normalizeAuthCallbackNextPath(requestedNext);
	const nonce = crypto.randomUUID();

	if (flow === "one_tap") {
		return NextResponse.json({ oneTapNonce: nonce, next: safePath, flow });
	}

	const callbackUrl = `${origin}/api/auth/callback?next=${encodeURIComponent(safePath)}&cb_nonce=${encodeURIComponent(nonce)}`;

	const response = NextResponse.json({ callbackUrl });
	response.cookies.set({
		name: AUTH_CALLBACK_NONCE_COOKIE,
		value: nonce,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/api/auth/callback",
		maxAge: AUTH_CALLBACK_NONCE_TTL_SECONDS,
	});

	return response;
}
