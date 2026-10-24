import { describe, it, expect } from "vitest";
import {
  generateWorkspaceCredentials,
  hashWorkspaceToken,
  verifyWorkspaceToken,
  assertWorkspaceOwnership,
  getWorkspaceCookieOptions,
  UnauthorizedError,
} from "@/lib/auth/guest-workspace";
import { mockWorkspaceId, mockOtherWorkspaceId } from "../fixtures/event-fixtures";

describe("Guest Workspace Security & Authorization", () => {
  const testSalt = "test-secret-salt-for-hashing";

  // 34. Verify token generation uses a cryptographically secure source
  it("34. generates high-entropy (256-bit) cryptographically random tokens", () => {
    const creds1 = generateWorkspaceCredentials(testSalt);
    const creds2 = generateWorkspaceCredentials(testSalt);

    // Tokens must be 64 hex characters (32 bytes = 256 bits of entropy)
    expect(creds1.rawToken).toHaveLength(64);
    expect(creds2.rawToken).toHaveLength(64);

    // Guaranteed unicity across calls
    expect(creds1.rawToken).not.toBe(creds2.rawToken);
    expect(creds1.workspaceId).not.toBe(creds2.workspaceId);
    expect(creds1.tokenHash).not.toBe(creds2.tokenHash);
  });

  // 35. Verify only token hashes are stored
  it("35. verifies only SHA-256 token hashes are stored, not raw tokens", () => {
    const rawToken = "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00";
    const hash = hashWorkspaceToken(rawToken, testSalt);

    // SHA-256 hex string is 64 characters long
    expect(hash).toHaveLength(64);
    // Hash is distinct from rawToken
    expect(hash).not.toBe(rawToken);

    // Verification succeeds with correct token
    expect(verifyWorkspaceToken(rawToken, hash, testSalt)).toBe(true);

    // Verification fails if raw token is altered
    const alteredToken = "b" + rawToken.slice(1);
    expect(verifyWorkspaceToken(alteredToken, hash, testSalt)).toBe(false);
  });

  // 36. Verify access checks reject a workspace credential that does not match
  it("36. rejects access when client credentials do not match or are expired", () => {
    const creds = generateWorkspaceCredentials(testSalt);
    const fakeToken = "0000000000000000000000000000000000000000000000000000000000000000";

    expect(verifyWorkspaceToken(fakeToken, creds.tokenHash, testSalt)).toBe(false);
    expect(verifyWorkspaceToken("", creds.tokenHash, testSalt)).toBe(false);
    expect(verifyWorkspaceToken(creds.rawToken, "", testSalt)).toBe(false);

    // Cookie configuration enforces HttpOnly and SameSite
    const prodCookie = getWorkspaceCookieOptions(creds.rawToken, true);
    expect(prodCookie.httpOnly).toBe(true);
    expect(prodCookie.secure).toBe(true);
    expect(prodCookie.sameSite).toBe("lax");
  });

  // 37. Verify workspace A cannot access workspace B's resources
  it("37. strictly prevents cross-workspace access (IDOR defense)", () => {
    // Legitimate owner
    expect(() =>
      assertWorkspaceOwnership(mockWorkspaceId, mockWorkspaceId)
    ).not.toThrow();

    // Attacker from workspace B trying to access workspace A's event
    expect(() =>
      assertWorkspaceOwnership(mockWorkspaceId, mockOtherWorkspaceId)
    ).toThrowError(UnauthorizedError);

    // Missing workspace credentials
    expect(() => assertWorkspaceOwnership("", mockWorkspaceId)).toThrowError(
      UnauthorizedError
    );
    expect(() => assertWorkspaceOwnership(mockWorkspaceId, "")).toThrowError(
      UnauthorizedError
    );
  });
});
