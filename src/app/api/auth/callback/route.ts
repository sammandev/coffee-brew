import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_CALLBACK_NONCE_COOKIE, isAllowedOtpType, normalizeAuthCallbackNextPath } from "@/lib/auth-callback";
import { clientEnv } from "@/lib/config/client";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	const tokenHash = searchParams.get("token_hash");
	const type = searchParams.get("type");
	const callbackNonce = searchParams.get("cb_nonce")?.trim() ?? "";
	const hasCallbackNonce = callbackNonce.length > 0;
	const safePath = normalizeAuthCallbackNextPath(searchParams.get("next"));

	const cookieStore = await cookies();
	const expectedNonce = cookieStore.get(AUTH_CALLBACK_NONCE_COOKIE)?.value ?? "";
	const hasAuthPayload = Boolean(code || tokenHash);

	if (hasAuthPayload && (!hasCallbackNonce || !expectedNonce || callbackNonce !== expectedNonce)) {
		cookieStore.set({
			name: AUTH_CALLBACK_NONCE_COOKIE,
			value: "",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/api/auth/callback",
			maxAge: 0,
		});
		return NextResponse.redirect(`${origin}/login?error=auth_callback_nonce_invalid&context=oauth_callback`);
	}

	cookieStore.set({
		name: AUTH_CALLBACK_NONCE_COOKIE,
		value: "",
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/api/auth/callback",
		maxAge: 0,
	});

	const supabase = createServerClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				for (const cookie of cookiesToSet) {
					cookieStore.set(cookie.name, cookie.value, cookie.options);
				}
			},
		},
	});

	// PKCE flow: exchange authorization code for session (OAuth + magic link)
	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			return NextResponse.redirect(`${origin}${safePath}`);
		}
	}

	// Implicit flow: verify OTP token hash (email confirmation, recovery)
	if (tokenHash && isAllowedOtpType(type)) {
		const { error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type,
		});
		if (!error) {
			return NextResponse.redirect(`${origin}${safePath}`);
		}
	}

	// If code exchange failed or no code provided, redirect to login with error
	return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
