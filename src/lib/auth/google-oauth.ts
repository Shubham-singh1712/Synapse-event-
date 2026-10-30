import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, sessions } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { AUTH_SESSION_DAYS, AuthenticatedUser, createSignedSessionToken } from "./auth-service";
import type { NextRequest } from "next/server";
import { sanitizeRedirectPath } from "./return-url";

export const GOOGLE_OAUTH_STATE_COOKIE = "synapse_oauth_state";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
}

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export class GoogleOAuthError extends Error {
  code: string;
  constructor(message: string, code = "GOOGLE_OAUTH_ERROR") {
    super(message);
    this.name = "GoogleOAuthError";
    this.code = code;
  }
}

/**
 * Returns Google OAuth client configuration from server-side environment variables.
 * Never expose clientSecret to the browser.
 */
export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const isConfigured = Boolean(clientId && clientSecret);

  return {
    clientId,
    clientSecret,
    isConfigured,
  };
}

/**
 * Derives the canonical OAuth redirect URI based on request headers or environment.
 * Dynamically resolves port (e.g. 3001 vs 3000) when requested from browser.
 */
export function getGoogleRedirectUri(req?: NextRequest): string {
  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) {
      return `${proto}://${host}/api/auth/google/callback`;
    }
  }

  // If explicitly configured in environment, use it
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const origin = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
    return `${origin}/api/auth/google/callback`;
  }

  return "http://localhost:3001/api/auth/google/callback";
}

/**
 * Generates a cryptographically secure random state token to prevent CSRF attacks.
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a URL-safe base64 encoded OAuth state payload containing state, redirectUri, and returnUrl.
 */
export function encodeOAuthStateCookie(state: string, redirectUri?: string, returnUrl?: string): string {
  const payload = {
    s: state,
    r: redirectUri || "",
    u: returnUrl ? sanitizeRedirectPath(returnUrl) : "",
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Sets the secure state cookie for CSRF validation during OAuth flow,
 * preserving the exact redirect URI and safe returnUrl used for this authorization cycle.
 */
export async function setOAuthStateCookie(
  state: string,
  redirectUri?: string,
  returnUrl?: string
): Promise<string> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const cookieValue = encodeOAuthStateCookie(state, redirectUri, returnUrl);

  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes lifetime
  });

  return cookieValue;
}

/**
 * Validates and clears the OAuth state cookie.
 * Supports canonical base64url JSON payload as well as legacy pipe-delimited format.
 * Returns the exact redirectUri and safe returnUrl that initiated the flow.
 */
export async function validateAndClearOAuthStateCookie(
  receivedState: string
): Promise<{ valid: boolean; redirectUri?: string; returnUrl?: string }> {
  if (!receivedState || receivedState.trim().length === 0) {
    return { valid: false };
  }

  const cookieStore = await cookies();
  const storedRaw = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  // Clear cookie regardless of outcome to prevent replay attacks
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!storedRaw) {
    return { valid: false };
  }

  let storedState = "";
  let storedRedirectUri: string | undefined;
  let storedReturnUrl: string | undefined;

  // 1. Try base64url JSON decode first (canonical format)
  try {
    const jsonStr = Buffer.from(storedRaw, "base64url").toString("utf-8");
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.s === "string") {
      storedState = parsed.s;
      storedRedirectUri = parsed.r || undefined;
      storedReturnUrl = parsed.u || undefined;
    }
  } catch {
    // 2. Fallback: try URI-decoded pipe format or raw pipe format
    const decoded = decodeURIComponent(storedRaw);
    const parts = (decoded.includes("|") ? decoded : storedRaw).split("|");
    storedState = parts[0] || "";
    storedRedirectUri = parts[1] || undefined;
    storedReturnUrl = parts[2] || undefined;
  }

  if (!storedState) {
    return { valid: false };
  }

  try {
    const bufReceived = Buffer.from(receivedState);
    const bufStored = Buffer.from(storedState);
    if (bufReceived.length !== bufStored.length) {
      return { valid: false };
    }
    const isMatch = crypto.timingSafeEqual(bufReceived, bufStored);
    return {
      valid: isMatch,
      redirectUri: storedRedirectUri,
      returnUrl: storedReturnUrl ? sanitizeRedirectPath(storedReturnUrl) : undefined,
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Builds the Google OAuth 2.0 authorization URL.
 */
export function buildGoogleAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  prompt?: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", params.prompt || "select_account");

  return url.toString();
}

/**
 * Server-side exchange of the authorization code for Google access & ID tokens.
 */
export async function exchangeGoogleAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ accessToken: string; idToken?: string }> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new GoogleOAuthError(
      `Failed to exchange authorization code with Google: ${response.status} ${errorText}`,
      "GOOGLE_TOKEN_EXCHANGE_FAILED"
    );
  }

  const data = (await response.json()) as { access_token?: string; id_token?: string };
  if (!data.access_token) {
    throw new GoogleOAuthError("Missing access_token in Google token response", "GOOGLE_TOKEN_EXCHANGE_FAILED");
  }

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
  };
}

/**
 * Fetches the user profile from Google's OpenID UserInfo endpoint.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new GoogleOAuthError(
      `Failed to fetch user profile from Google: ${response.status} ${errText}`,
      "GOOGLE_USERINFO_FAILED"
    );
  }

  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  };

  if (!data.sub || !data.email) {
    throw new GoogleOAuthError("Invalid user profile received from Google", "GOOGLE_INVALID_PROFILE");
  }

  return {
    sub: data.sub,
    email: data.email.toLowerCase(),
    name: data.name?.trim() || data.email.split("@")[0] || "Google User",
    picture: data.picture,
    email_verified: data.email_verified,
  };
}

/**
 * Links an existing user account or creates a new one from verified Google identity,
 * and creates an active session.
 */
export async function linkOrCreateGoogleUserAndSession(
  profile: GoogleUserProfile
): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
  const { ensureDbReady } = await import("@/lib/db/client");
  await ensureDbReady();
  const db = getDb();
  const email = profile.email.toLowerCase();

  // 1. Check if user already exists
  const existingRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let targetUser: typeof users.$inferSelect;

  if (existingRows.length > 0 && existingRows[0]) {
    // User exists: Link to existing account (do NOT duplicate user)
    targetUser = existingRows[0];
  } else {
    // User does not exist: Provision new user
    // Generate an unguessable non-password hash to satisfy schema constraint without creating security hole
    const unusablePasswordHash = `oauth:google:${crypto.randomBytes(32).toString("hex")}`;

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: profile.name,
        passwordHash: unusablePasswordHash,
      })
      .returning();

    if (!newUser) {
      throw new GoogleOAuthError("Failed to provision new user from Google identity", "ACCOUNT_CREATION_FAILED");
    }

    targetUser = newUser;
  }

  // 2. Create active session in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_SESSION_DAYS);

  const sessionToken = createSignedSessionToken({
    userId: targetUser.id,
    email: targetUser.email,
    name: targetUser.name,
    expiresAt: expiresAt.getTime(),
  });

  await db.insert(sessions).values({
    userId: targetUser.id,
    sessionToken,
    expiresAt,
  });

  return {
    user: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      createdAt: targetUser.createdAt,
    },
    sessionToken,
  };
}

export {
  sanitizeRedirectPath,
  validateArchetype,
  buildAuthRedirectUrl,
  type ValidArchetype,
  VALID_ARCHETYPES,
} from "./return-url";

