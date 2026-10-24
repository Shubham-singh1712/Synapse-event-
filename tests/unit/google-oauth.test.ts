import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildGoogleAuthorizationUrl,
  generateOAuthState,
  getGoogleOAuthConfig,
  sanitizeRedirectPath,
  GOOGLE_AUTH_URL,
  getGoogleRedirectUri,
  validateArchetype,
  buildAuthRedirectUrl,
} from "@/lib/auth/google-oauth";
import { NextRequest } from "next/server";

describe("Google OAuth Security & Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  // 1. Authorization URL formatting & OpenID parameters
  it("builds compliant Google OAuth 2.0 authorization URL with all required OpenID scopes", () => {
    const authUrl = buildGoogleAuthorizationUrl({
      clientId: "test-client-id.apps.googleusercontent.com",
      redirectUri: "http://localhost:3000/api/auth/google/callback",
      state: "mock_state_1234567890abcdef",
    });

    const parsed = new URL(authUrl);
    expect(parsed.origin + parsed.pathname).toBe(GOOGLE_AUTH_URL);
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id.apps.googleusercontent.com");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("openid email profile");
    expect(parsed.searchParams.get("state")).toBe("mock_state_1234567890abcdef");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("select_account");
  });

  // 2. Cryptographic high-entropy state generation for CSRF defense
  it("generates 256-bit cryptographically unique state tokens for CSRF protection", () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();

    expect(state1).toHaveLength(64); // 32 bytes hex = 64 characters
    expect(state2).toHaveLength(64);
    expect(state1).not.toBe(state2);
  });

  // 3. Configuration validation
  it("identifies when Google OAuth credentials are unconfigured or partially configured", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const unconfigured = getGoogleOAuthConfig();
    expect(unconfigured.isConfigured).toBe(false);
    expect(unconfigured.clientId).toBe("");
    expect(unconfigured.clientSecret).toBe("");

    // Partial config (only client ID) is still considered unconfigured
    process.env.GOOGLE_CLIENT_ID = "some-client-id";
    delete process.env.GOOGLE_CLIENT_SECRET;

    const partial = getGoogleOAuthConfig();
    expect(partial.isConfigured).toBe(false);

    // Full config
    process.env.GOOGLE_CLIENT_SECRET = "some-client-secret";
    const full = getGoogleOAuthConfig();
    expect(full.isConfigured).toBe(true);
    expect(full.clientId).toBe("some-client-id");
    expect(full.clientSecret).toBe("some-client-secret");
  });

  // 4. Redirect URI generation and host derivation
  it("derives the canonical callback URI correctly from environment and request headers", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    // Derived from request on port 3001
    const req3001 = new NextRequest("http://localhost:3001/api/auth/google", {
      headers: {
        host: "localhost:3001",
        "x-forwarded-host": "localhost:3001",
        "x-forwarded-proto": "http",
      },
    });
    expect(getGoogleRedirectUri(req3001)).toBe("http://localhost:3001/api/auth/google/callback");

    // Derived from request on port 3000
    const req3000 = new NextRequest("http://localhost:3000/api/auth/google", {
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "localhost:3000",
        "x-forwarded-proto": "http",
      },
    });
    expect(getGoogleRedirectUri(req3000)).toBe("http://localhost:3000/api/auth/google/callback");
  });

  // 5. Open Redirect Vulnerability Prevention
  it("strictly validates and sanitizes post-auth redirect paths to prevent open redirects", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/events/new")).toBe("/events/new");

    // Open redirect attack vectors
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("///evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("\\\\evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
    expect(sanitizeRedirectPath(undefined)).toBe("/dashboard");

    // Loop prevention: redirecting back to auth pages falls back to /dashboard
    expect(sanitizeRedirectPath("/sign-in")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/sign-up")).toBe("/dashboard");
  });

  // 6. Event Archetype Validation & Preselection
  it("validates supported celebration archetypes safely and case-insensitively", () => {
    expect(validateArchetype("WEDDING")).toBe("WEDDING");
    expect(validateArchetype("wedding")).toBe("WEDDING");
    expect(validateArchetype("BIRTHDAY")).toBe("BIRTHDAY");
    expect(validateArchetype("birthday")).toBe("BIRTHDAY");
    expect(validateArchetype("COMMUNITY")).toBe("COMMUNITY");
    expect(validateArchetype("community")).toBe("COMMUNITY");

    // Unsupported or malformed inputs return null
    expect(validateArchetype("GALA")).toBeNull();
    expect(validateArchetype("DINNER")).toBeNull();
    expect(validateArchetype("")).toBeNull();
    expect(validateArchetype(null)).toBeNull();
    expect(validateArchetype(undefined)).toBeNull();
  });

  // 7. Safe Auth Redirect URL Construction
  it("constructs safe authentication redirect URLs preserving returnUrl and archetype", () => {
    // Wedding preselection
    const weddingAuth = buildAuthRedirectUrl("WEDDING", null, "/sign-in");
    expect(weddingAuth).toContain("/sign-in?");
    expect(weddingAuth).toContain("returnUrl=%2Fevents%2Fnew%3Ftype%3DWEDDING");
    expect(weddingAuth).toContain("type=WEDDING");

    // Birthday preselection
    const birthdayAuth = buildAuthRedirectUrl("BIRTHDAY", null, "/sign-up");
    expect(birthdayAuth).toContain("/sign-up?");
    expect(birthdayAuth).toContain("returnUrl=%2Fevents%2Fnew%3Ftype%3DBIRTHDAY");
    expect(birthdayAuth).toContain("type=BIRTHDAY");

    // Community preselection
    const communityAuth = buildAuthRedirectUrl("COMMUNITY", null, "/sign-in");
    expect(communityAuth).toContain("/sign-in?");
    expect(communityAuth).toContain("returnUrl=%2Fevents%2Fnew%3Ftype%3DCOMMUNITY");
    expect(communityAuth).toContain("type=COMMUNITY");

    // Invalid archetype defaults safely
    const invalidAuth = buildAuthRedirectUrl("INVALID", null, "/sign-in");
    expect(invalidAuth).toContain("returnUrl=%2Fevents%2Fnew");
    expect(invalidAuth).not.toContain("type=");
  });
});
