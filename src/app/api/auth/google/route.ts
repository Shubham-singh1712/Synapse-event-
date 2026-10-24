import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
  generateOAuthState,
  setOAuthStateCookie,
  buildGoogleAuthorizationUrl,
  sanitizeRedirectPath,
  validateArchetype,
} from "@/lib/auth/google-oauth";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const returnUrlParam = searchParams.get("returnUrl");
  const typeParam = searchParams.get("type");

  let targetReturnUrl: string | undefined = returnUrlParam
    ? sanitizeRedirectPath(returnUrlParam)
    : undefined;

  if ((!targetReturnUrl || targetReturnUrl === "/dashboard") && typeParam) {
    const valid = validateArchetype(typeParam);
    if (valid) targetReturnUrl = `/events/new?type=${valid}`;
  }

  const referer = req.headers.get("referer") || "";
  const fallbackPath = referer.includes("/sign-up") ? "/sign-up" : "/sign-in";

  const config = getGoogleOAuthConfig();

  // If credentials are not configured in environment, redirect with informative error
  if (!config.isConfigured) {
    const errorUrl = new URL(fallbackPath, req.url);
    errorUrl.searchParams.set("error", "GOOGLE_OAUTH_UNCONFIGURED");
    if (targetReturnUrl) errorUrl.searchParams.set("returnUrl", targetReturnUrl);
    if (typeParam) errorUrl.searchParams.set("type", typeParam);
    return NextResponse.redirect(errorUrl);
  }

  // Derive redirect URI and build Google OAuth URL
  const redirectUri = getGoogleRedirectUri(req);

  // Generate secure state token and store redirect URI + returnUrl in secure cookie for CSRF defense
  const state = generateOAuthState();
  await setOAuthStateCookie(state, redirectUri, targetReturnUrl);

  const authUrl = buildGoogleAuthorizationUrl({
    clientId: config.clientId,
    redirectUri,
    state,
  });

  return NextResponse.redirect(authUrl);
}

export async function POST(req: NextRequest) {
  return GET(req);
}
