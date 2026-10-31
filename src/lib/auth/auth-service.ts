import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb, ensureDbReady } from "@/lib/db/client";
import { users, sessions } from "@/lib/db/schema";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "synapse_auth_session";
export const AUTH_SESSION_DAYS = 30;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Derives a salted password hash using Node.js scrypt.
 * Output format: `salt:derivedKey` (hex encoded).
 */
export function hashPassword(password: string): string {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Timing-safe password verification.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;
    const [salt, originalDerived] = parts;
    if (!salt || !originalDerived) return false;

    const testDerived = crypto.scryptSync(password, salt, 64).toString("hex");
    const testBuffer = Buffer.from(testDerived, "hex");
    const originalBuffer = Buffer.from(originalDerived, "hex");

    if (testBuffer.length !== originalBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(testBuffer, originalBuffer);
  } catch {
    return false;
  }
}

/**
 * Registers a new user and provisions an active session in PostgreSQL.
 */
export async function signUpUser(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
  await ensureDbReady();
  const db = getDb();
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthenticationError("Please provide a valid email address.");
  }
  if (!name || name.length < 2) {
    throw new AuthenticationError("Name must be at least 2 characters.");
  }
  if (!params.password || params.password.length < 8) {
    throw new AuthenticationError("Password must be at least 8 characters.");
  }

  // Check if user already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new AuthenticationError("An account with this email address already exists.");
  }

  const passwordHash = hashPassword(params.password);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_SESSION_DAYS);

  return await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to insert user account.");
    }

    const sessionToken = createSignedSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      expiresAt: expiresAt.getTime(),
    });

    await tx.insert(sessions).values({
      userId: newUser.id,
      sessionToken,
      expiresAt,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt,
      },
      sessionToken,
    };
  });
}

/**
 * Derives a consistent server-side secret key for signing session tokens.
 */
export function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET_SALT?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    "synapse-event-secure-session-secret-salt-minimum-32chars"
  );
}

export interface SessionTokenPayload {
  userId: string;
  email: string;
  name: string;
  expiresAt: number; // ms timestamp
}

/**
 * Generates a cryptographically signed session token (compact URL-safe HMAC).
 * Fits well under the varchar(255) column constraint.
 */
export function createSignedSessionToken(payload: SessionTokenPayload): string {
  const secret = getSessionSecret();
  const tokenId = crypto.randomBytes(8).toString("hex");
  const compact = {
    u: payload.userId,
    e: payload.email,
    n: (payload.name || "").slice(0, 30),
    x: payload.expiresAt,
  };
  const b64 = Buffer.from(JSON.stringify(compact)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${tokenId}.${b64}`)
    .digest("base64url");

  return `${tokenId}.${b64}.${sig}`;
}

/**
 * Validates the HMAC signature and expiration of a signed session token.
 */
export function verifySignedSessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [tokenId, b64, sig] = parts;
  if (!tokenId || !b64 || !sig) return null;

  const secret = getSessionSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${tokenId}.${b64}`)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const raw = Buffer.from(b64, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.u || !parsed.e || !parsed.x) return null;
    if (typeof parsed.x === "number" && parsed.x < Date.now()) return null;

    return {
      userId: parsed.u,
      email: parsed.e,
      name: parsed.n || parsed.e.split("@")[0] || "User",
      expiresAt: parsed.x,
    };
  } catch {
    return null;
  }
}

/**
 * Authenticates user credentials and generates a new session.
 */
export async function signInUser(params: {
  email: string;
  password: string;
}): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
  await ensureDbReady();
  const db = getDb();
  const email = params.email.trim().toLowerCase();

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = userRows[0];
  if (!user || !verifyPassword(params.password, user.passwordHash)) {
    throw new AuthenticationError("Invalid email or password.");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_SESSION_DAYS);

  const sessionToken = createSignedSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    expiresAt: expiresAt.getTime(),
  });

  await db.insert(sessions).values({
    userId: user.id,
    sessionToken,
    expiresAt,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    sessionToken,
  };
}

/**
 * Validates a session token and returns the authenticated user if valid.
 * Supports persistent PostgreSQL database queries with serverless container re-hydration fallback.
 */
export async function validateSessionToken(
  sessionToken: string
): Promise<AuthenticatedUser | null> {
  if (!sessionToken || sessionToken.trim().length === 0) return null;

  // 1. Verify token signature first if it is a signed token
  const verifiedPayload = verifySignedSessionToken(sessionToken);
  if (sessionToken.includes(".") && !verifiedPayload) {
    return null;
  }

  try {
    await ensureDbReady();
    const db = getDb();

    // 2. Query database sessions table
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.sessionToken, sessionToken), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (rows.length > 0 && rows[0]) {
      const row = rows[0];
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        createdAt: row.createdAt,
      };
    }

    // 3. Fallback for stateless serverless containers without shared persistent DB
    if (verifiedPayload) {
      try {
        const existingUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, verifiedPayload.userId))
          .limit(1);

        if (existingUsers.length === 0) {
          const byEmail = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, verifiedPayload.email.toLowerCase()))
            .limit(1);

          if (byEmail.length === 0) {
            await db
              .insert(users)
              .values({
                id: verifiedPayload.userId,
                email: verifiedPayload.email.toLowerCase(),
                name: verifiedPayload.name,
                passwordHash: `oauth:session:${crypto.randomBytes(16).toString("hex")}`,
              })
              .onConflictDoNothing();
          }
        }

        await db
          .insert(sessions)
          .values({
            userId: verifiedPayload.userId,
            sessionToken,
            expiresAt: new Date(verifiedPayload.expiresAt),
          })
          .onConflictDoNothing();
      } catch {
        // Silently continue if database has temporary concurrent lock
      }

      return {
        id: verifiedPayload.userId,
        email: verifiedPayload.email,
        name: verifiedPayload.name,
        createdAt: new Date(),
      };
    }

    return null;
  } catch {
    if (verifiedPayload) {
      return {
        id: verifiedPayload.userId,
        email: verifiedPayload.email,
        name: verifiedPayload.name,
        createdAt: new Date(),
      };
    }
    return null;
  }
}

/**
 * Terminates a session token from the database.
 */
export async function terminateSession(sessionToken: string): Promise<void> {
  if (!sessionToken) return;
  if (globalThis.__synapse_pending_session__?.sessionToken === sessionToken) {
    globalThis.__synapse_pending_session__ = undefined;
  }
  try {
    await ensureDbReady();
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  } catch {
    // If DB is offline, continue silently
  }
}

/**
 * Retrieves the current authenticated user from request cookies.
 * On cold serverless containers without DATABASE_URL where the embedded DB
 * has not yet been initialized, verifies signed HMAC session tokens directly
 * in <0.1ms and defers PGlite hydration until a route actually queries the DB.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  if (!process.env.DATABASE_URL && !globalThis.__synapse_db__ && token.includes(".")) {
    const verifiedPayload = verifySignedSessionToken(token);
    if (!verifiedPayload) {
      return null;
    }
    globalThis.__synapse_pending_session__ = {
      sessionToken: token,
      userId: verifiedPayload.userId,
      email: verifiedPayload.email,
      name: verifiedPayload.name,
      expiresAt: verifiedPayload.expiresAt,
    };
    return {
      id: verifiedPayload.userId,
      email: verifiedPayload.email,
      name: verifiedPayload.name,
      createdAt: new Date(),
    };
  }

  return await validateSessionToken(token);
}

/**
 * Sets the secure session cookie.
 */
export async function setAuthSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * AUTH_SESSION_DAYS,
  });
}

/**
 * Clears the session cookie.
 */
export async function clearAuthSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
