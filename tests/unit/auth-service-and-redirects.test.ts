import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  AUTH_COOKIE_NAME,
  AUTH_SESSION_DAYS,
  createSignedSessionToken,
  verifySignedSessionToken,
} from "@/lib/auth/auth-service";
import {
  sanitizeRedirectPath,
  validateArchetype,
  buildAuthRedirectUrl,
  VALID_ARCHETYPES,
} from "@/lib/auth/return-url";

describe("Cryptographic Authentication & Password Security", () => {
  it("generates a salted scrypt hash with distinct salts for identical passwords", () => {
    const pwd = "CelebrationPassword2026!";
    const hash1 = hashPassword(pwd);
    const hash2 = hashPassword(pwd);

    expect(hash1).not.toBe(hash2);
    expect(hash1).toContain(":");
    expect(hash2).toContain(":");

    const [salt1, key1] = hash1.split(":");
    const [salt2, key2] = hash2.split(":");

    expect(salt1).toHaveLength(32); // 16 bytes hex = 32 chars
    expect(key1).toHaveLength(128); // 64 bytes hex = 128 chars
    expect(salt1).not.toBe(salt2);
  });

  it("rejects passwords under 8 characters", () => {
    expect(() => hashPassword("short")).toThrow(/at least 8 characters/);
    expect(() => hashPassword("")).toThrow(/at least 8 characters/);
  });

  it("verifies correct passwords and rejects incorrect passwords in timing-safe manner", () => {
    const pwd = "SecureEventPlanPass@99";
    const hash = hashPassword(pwd);

    expect(verifyPassword(pwd, hash)).toBe(true);
    expect(verifyPassword("WrongPassword123!", hash)).toBe(false);
    expect(verifyPassword(pwd.toLowerCase(), hash)).toBe(false);
    expect(verifyPassword("", hash)).toBe(false);
    expect(verifyPassword(pwd, "corrupted:hash")).toBe(false);
    expect(verifyPassword(pwd, "invalid-format-without-colon")).toBe(false);
  });

  it("defines standard session parameters", () => {
    expect(AUTH_COOKIE_NAME).toBe("synapse_auth_session");
    expect(AUTH_SESSION_DAYS).toBe(30);
  });

  it("creates and verifies cryptographically signed session tokens", () => {
    const payload = {
      userId: "4435bba0-91de-4fd9-a7b6-f140120b256f",
      email: "curator@synapse-event.com",
      name: "Curator User",
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = createSignedSessionToken(payload);
    expect(token.length).toBeLessThan(255);
    expect(token.split(".")).toHaveLength(3);

    const verified = verifySignedSessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified!.userId).toBe(payload.userId);
    expect(verified!.email).toBe(payload.email);
    expect(verified!.name).toBe(payload.name);

    // Tampered token rejection
    const [id, b64, sig] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ u: "hacked-user-id", e: "evil@attacker.com", x: payload.expiresAt })
    ).toString("base64url");
    const tamperedToken = `${id}.${tamperedPayload}.${sig}`;
    expect(verifySignedSessionToken(tamperedToken)).toBeNull();

    // Expired token rejection
    const expiredPayload = {
      ...payload,
      expiresAt: Date.now() - 1000,
    };
    const expiredToken = createSignedSessionToken(expiredPayload);
    expect(verifySignedSessionToken(expiredToken)).toBeNull();
  });
});

describe("Return URL Sanitization & Open Redirect Prevention", () => {
  it("allows safe internal relative paths", () => {
    expect(sanitizeRedirectPath("/events/new")).toBe("/events/new");
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/events/123-abc/budget")).toBe("/events/123-abc/budget");
    expect(sanitizeRedirectPath("/privacy")).toBe("/privacy");
    expect(sanitizeRedirectPath("/services")).toBe("/services");
  });

  it("neutralizes open redirect attempts to external domains", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("http://attacker.com/steal")).toBe("/dashboard");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
    expect(sanitizeRedirectPath("//evil.com/phish")).toBe("/dashboard");
  });

  it("blocks backslash bypass attempts and protocol-relative paths", () => {
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("\\evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/dashboard\\../attacker")).toBe("/dashboard");
  });

  it("prevents redirect loops back to auth pages", () => {
    expect(sanitizeRedirectPath("/sign-in")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/sign-up")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/sign-in?returnUrl=/dashboard")).toBe("/dashboard");
  });

  it("falls back to default dashboard on null, undefined, or empty strings", () => {
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
    expect(sanitizeRedirectPath(undefined)).toBe("/dashboard");
    expect(sanitizeRedirectPath("")).toBe("/dashboard");
    expect(sanitizeRedirectPath("   ")).toBe("/dashboard");
  });
});

describe("Event Archetype Parameter Validation & Redirect Building", () => {
  it("validates recognized celebration archetypes", () => {
    expect(VALID_ARCHETYPES).toEqual(["WEDDING", "BIRTHDAY", "COMMUNITY"]);
    expect(validateArchetype("WEDDING")).toBe("WEDDING");
    expect(validateArchetype("BIRTHDAY")).toBe("BIRTHDAY");
    expect(validateArchetype("COMMUNITY")).toBe("COMMUNITY");
    expect(validateArchetype("wedding")).toBe("WEDDING"); // Case insensitive trimming
  });

  it("rejects arbitrary or malicious archetype strings", () => {
    expect(validateArchetype("UNKNOWN")).toBeNull();
    expect(validateArchetype("<script>")).toBeNull();
    expect(validateArchetype("")).toBeNull();
    expect(validateArchetype(null)).toBeNull();
    expect(validateArchetype(undefined)).toBeNull();
  });

  it("constructs safe authentication redirect URLs", () => {
    const url1 = buildAuthRedirectUrl("WEDDING", "/events/custom-123", "/sign-in");
    expect(url1).toContain("/sign-in?");
    expect(url1).toContain("returnUrl=%2Fevents%2Fcustom-123");
    expect(url1).toContain("type=WEDDING");

    const url2 = buildAuthRedirectUrl(null, null, "/sign-up");
    expect(url2).toContain("/sign-up?");
    expect(url2).toContain("returnUrl=%2Fevents%2Fnew");
  });
});
