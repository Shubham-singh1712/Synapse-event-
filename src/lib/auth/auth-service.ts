import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
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
  const sessionToken = crypto.randomBytes(32).toString("hex");
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
 * Authenticates user credentials and generates a new session.
 */
export async function signInUser(params: {
  email: string;
  password: string;
}): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
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

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_SESSION_DAYS);

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
 */
export async function validateSessionToken(
  sessionToken: string
): Promise<AuthenticatedUser | null> {
  if (!sessionToken || sessionToken.trim().length === 0) return null;

  try {
    const db = getDb();
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

    if (rows.length === 0 || !rows[0]) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Terminates a session token from the database.
 */
export async function terminateSession(sessionToken: string): Promise<void> {
  if (!sessionToken) return;
  try {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  } catch {
    // If DB is offline, continue silently
  }
}

/**
 * Retrieves the current authenticated user from request cookies.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
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
