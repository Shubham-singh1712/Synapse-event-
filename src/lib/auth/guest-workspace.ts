import crypto from "node:crypto";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized workspace access") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface WorkspaceCredentials {
  workspaceId: string;
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CookieConfig {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

export const DEFAULT_COOKIE_NAME = "synapse_ws_token";
export const DEFAULT_TOKEN_VALIDITY_DAYS = 30;

/**
 * Derives a cryptographic SHA-256 hash from a raw workspace token and an optional server salt.
 * Only the hash is ever persisted to storage; the raw token is never saved in the database.
 */
export function hashWorkspaceToken(rawToken: string, salt = ""): string {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length === 0) {
    throw new Error("Raw token must be a non-empty string.");
  }
  return crypto
    .createHash("sha256")
    .update(`${salt}:${rawToken.trim()}`)
    .digest("hex");
}

/**
 * Constant-time comparison to verify a raw token against a stored hash.
 * Timing-safe against side-channel analysis.
 */
export function verifyWorkspaceToken(
  rawToken: string,
  storedHash: string,
  salt = ""
): boolean {
  if (!rawToken || !storedHash) return false;
  try {
    const computedHash = hashWorkspaceToken(rawToken, salt);
    const computedBuffer = Buffer.from(computedHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");

    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a fresh, cryptographically secure guest workspace identity and access token.
 * Token entropy: 256 bits from crypto.randomBytes(32).
 */
export function generateWorkspaceCredentials(salt = ""): WorkspaceCredentials {
  const workspaceId = crypto.randomUUID();
  // 32 bytes = 256 bits of high-entropy randomness
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashWorkspaceToken(rawToken, salt);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_TOKEN_VALIDITY_DAYS);

  return {
    workspaceId,
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Returns standardized, secure HTTP-only cookie configuration for delivering the raw token.
 */
export function getWorkspaceCookieOptions(
  rawToken: string,
  isProduction = process.env.NODE_ENV === "production"
): CookieConfig {
  return {
    name: process.env.WORKSPACE_COOKIE_NAME || DEFAULT_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * DEFAULT_TOKEN_VALIDITY_DAYS, // 30 days in seconds
  };
}

/**
 * Validates that an operation on an event belongs strictly to the authorized workspace.
 * Rejects cross-workspace access attempts.
 */
export function assertWorkspaceOwnership(
  resourceWorkspaceId: string,
  authenticatedWorkspaceId: string
): void {
  if (!resourceWorkspaceId || !authenticatedWorkspaceId) {
    throw new UnauthorizedError("Missing workspace identity for authorization check.");
  }
  if (resourceWorkspaceId !== authenticatedWorkspaceId) {
    throw new UnauthorizedError(
      "Forbidden: Access denied. Resource belongs to another workspace."
    );
  }
}
