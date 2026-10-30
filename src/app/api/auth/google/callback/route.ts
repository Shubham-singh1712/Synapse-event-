import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
  validateAndClearOAuthStateCookie,
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserProfile,
  linkOrCreateGoogleUserAndSession,
} from "@/lib/auth/google-oauth";
import { setAuthSessionCookie } from "@/lib/auth/auth-service";
import { DatabaseConfigurationError } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const errorParam = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const signInUrl = new URL("/sign-in", req.url);

  // 1. Verify CSRF state token and retrieve the original redirect URI + returnUrl
  let stateResult: { valid: boolean; redirectUri?: string; returnUrl?: string } = {
    valid: false,
  };
  if (state) {
    stateResult = await validateAndClearOAuthStateCookie(state);
  }

  // Preserve returnUrl on sign-in redirect if present
  if (stateResult.returnUrl) {
    signInUrl.searchParams.set("returnUrl", stateResult.returnUrl);
  }

  // 2. Handle user cancellation or provider rejection from Google
  if (errorParam) {
    if (errorParam === "access_denied") {
      signInUrl.searchParams.set("error", "GOOGLE_AUTH_CANCELLED");
    } else {
      signInUrl.searchParams.set("error", "GOOGLE_AUTH_FAILED");
    }
    return NextResponse.redirect(signInUrl);
  }

  // 3. Validate presence of code and state validation outcome
  if (!code || !state || !stateResult.valid) {
    console.error("[Google OAuth Callback State Error]:", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      stateResultValid: stateResult.valid,
    });
    if (!stateResult.valid) {
      signInUrl.searchParams.set("error", "GOOGLE_AUTH_STATE_MISMATCH");
      signInUrl.searchParams.set("reason", "CSRF_STATE_COOKIE_MISSING_OR_MISMATCHED");
    } else {
      signInUrl.searchParams.set("error", "GOOGLE_AUTH_FAILED");
      signInUrl.searchParams.set("reason", "MISSING_AUTH_CODE");
    }
    return NextResponse.redirect(signInUrl);
  }

  // 4. Verify Google OAuth server configuration
  const config = getGoogleOAuthConfig();
  if (!config.isConfigured) {
    signInUrl.searchParams.set("error", "GOOGLE_OAUTH_UNCONFIGURED");
    return NextResponse.redirect(signInUrl);
  }

  try {
    const redirectUri = stateResult.redirectUri || getGoogleRedirectUri(req);

    // 5. Exchange code for Google tokens
    const { accessToken } = await exchangeGoogleAuthorizationCode({
      code,
      redirectUri,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });

    // 6. Fetch verified user profile
    const profile = await fetchGoogleUserProfile(accessToken);

    // 7. Establish or link database user account and session
    const { sessionToken } = await linkOrCreateGoogleUserAndSession(profile);

    // 8. Establish session cookie directly on the destination redirect response
    const targetPath = stateResult.returnUrl || "/dashboard";
    const destinationUrl = new URL(targetPath, req.url);
    const redirectResponse = NextResponse.redirect(destinationUrl);
    const isProduction = process.env.NODE_ENV === "production";

    redirectResponse.cookies.set("synapse_auth_session", sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return redirectResponse;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Google OAuth Callback Error]:", errorMsg);
    if (error instanceof DatabaseConfigurationError) {
      signInUrl.searchParams.set("error", "DATABASE_UNCONFIGURED");
      return NextResponse.redirect(signInUrl);
    }

    // Attach specific diagnostic reason (sanitized) to help diagnose provider rejections
    signInUrl.searchParams.set("error", "GOOGLE_AUTH_FAILED");
    if (errorMsg.includes("invalid_grant")) {
      signInUrl.searchParams.set("reason", "CODE_EXPIRED_OR_ALREADY_USED");
    } else if (errorMsg.includes("redirect_uri_mismatch")) {
      signInUrl.searchParams.set("reason", "REDIRECT_URI_MISMATCH");
    } else if (errorMsg.includes("invalid_client")) {
      signInUrl.searchParams.set("reason", "INVALID_CLIENT_SECRET");
    } else {
      signInUrl.searchParams.set("reason", encodeURIComponent(errorMsg.slice(0, 100)));
    }
    return NextResponse.redirect(signInUrl);
  }
}
