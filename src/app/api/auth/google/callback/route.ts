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

  // 1. Handle user cancellation or provider rejection from Google
  if (errorParam) {
    if (errorParam === "access_denied") {
      signInUrl.searchParams.set("error", "GOOGLE_AUTH_CANCELLED");
    } else {
      signInUrl.searchParams.set("error", "GOOGLE_AUTH_FAILED");
    }
    return NextResponse.redirect(signInUrl);
  }

  // 2. Validate presence of code and state
  if (!code || !state) {
    signInUrl.searchParams.set("error", "GOOGLE_AUTH_FAILED");
    return NextResponse.redirect(signInUrl);
  }

  // 3. Verify CSRF state token and retrieve the original redirect URI
  const stateResult = await validateAndClearOAuthStateCookie(state);
  if (!stateResult.valid) {
    signInUrl.searchParams.set("error", "GOOGLE_AUTH_STATE_MISMATCH");
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

    // 8. Establish session cookie
    await setAuthSessionCookie(sessionToken);

    // 9. Redirect to dashboard on success
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      signInUrl.searchParams.set("error", "DATABASE_UNCONFIGURED");
      return NextResponse.redirect(signInUrl);
    }

    signInUrl.searchParams.set("error", "GOOGLE_AUTH_FAILED");
    return NextResponse.redirect(signInUrl);
  }
}
