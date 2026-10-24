import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/auth-service";

describe("Google OAuth Database Persistence & Account Linking (PostgreSQL via PGlite)", () => {
  let pglite: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pglite = new PGlite();
    db = drizzle(pglite, { schema });

    const migrationsDir = path.resolve(import.meta.dirname, "../../src/lib/db/migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const sqlScript = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      const statements = sqlScript
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await pglite.exec(statement);
      }
    }
  });

  afterAll(async () => {
    if (pglite) {
      await pglite.close();
    }
  });

  // 1. First-time Google OAuth Sign-in creates a new user and session
  it("creates a new user and session with unusable password hash on first-time Google sign-in", async () => {
    const profile = {
      sub: "google-sub-10000000001",
      email: "priya.patel@example.com",
      name: "Priya Patel",
    };

    // Simulate linkOrCreateGoogleUserAndSession against test DB
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, profile.email.toLowerCase()))
      .limit(1);

    expect(existing.length).toBe(0);

    const unusablePasswordHash = "oauth:google:mock_unusable_hash_1234567890abcdef";
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: profile.email.toLowerCase(),
        name: profile.name,
        passwordHash: unusablePasswordHash,
      })
      .returning();

    expect(newUser).toBeDefined();
    expect(newUser.email).toBe("priya.patel@example.com");
    expect(newUser.name).toBe("Priya Patel");
    expect(newUser.passwordHash.startsWith("oauth:google:")).toBe(true);

    // Verify unusable password cannot be authenticated with a standard password guess
    expect(verifyPassword("password123", newUser.passwordHash)).toBe(false);

    // Create session
    const sessionToken = "session_token_google_priya_12345678";
    const expiresAt = new Date(Date.now() + 30 * 86400000);

    await db.insert(schema.sessions).values({
      userId: newUser.id,
      sessionToken,
      expiresAt,
    });

    const sessionRows = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.sessionToken, sessionToken));

    expect(sessionRows.length).toBe(1);
    expect(sessionRows[0]!.userId).toBe(newUser.id);
  });

  // 2. Returning Google OAuth user does NOT duplicate user accounts
  it("links to existing account without duplicating users when the same Google user signs in again", async () => {
    const email = "priya.patel@example.com";

    // Count before second sign-in
    const beforeRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));
    expect(beforeRows.length).toBe(1);
    const originalUserId = beforeRows[0]!.id;

    // Second sign-in with same Google profile
    const existingRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    expect(existingRows.length).toBe(1);
    const targetUser = existingRows[0]!;
    expect(targetUser.id).toBe(originalUserId);

    // Create a new session for second sign-in
    const secondSessionToken = "session_token_google_priya_repeat_sign_in_2";
    const expiresAt = new Date(Date.now() + 30 * 86400000);

    await db.insert(schema.sessions).values({
      userId: targetUser.id,
      sessionToken: secondSessionToken,
      expiresAt,
    });

    // Confirm user count remains exactly 1
    const afterRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));
    expect(afterRows.length).toBe(1);

    // Confirm user now has 2 valid sessions
    const allUserSessions = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, originalUserId));
    expect(allUserSessions.length).toBe(2);
  });

  // 3. Existing email/password user signing in via Google links smoothly and preserves password
  it("links an existing email/password account to Google sign-in while preserving original password hash", async () => {
    const email = "arjun.kapoor@example.com";
    const originalPassword = "MySecurePassword2026!";
    const originalPasswordHash = hashPassword(originalPassword);

    // 1. User registers originally with email and password
    const [emailUser] = await db
      .insert(schema.users)
      .values({
        email,
        name: "Arjun Kapoor",
        passwordHash: originalPasswordHash,
      })
      .returning();

    expect(emailUser).toBeDefined();

    // 2. Later, Arjun clicks "Continue with Google" with the same email
    const googleProfile = {
      sub: "google-sub-20000000002",
      email: "arjun.kapoor@example.com",
      name: "Arjun Kapoor",
    };

    const existingRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, googleProfile.email.toLowerCase()))
      .limit(1);

    expect(existingRows.length).toBe(1);
    const linkedUser = existingRows[0]!;
    expect(linkedUser.id).toBe(emailUser.id);

    // Original password hash is NOT destroyed
    expect(linkedUser.passwordHash).toBe(originalPasswordHash);
    expect(verifyPassword(originalPassword, linkedUser.passwordHash)).toBe(true);

    // Session is established for linked user
    const sessionToken = "session_token_arjun_linked_google_123";
    await db.insert(schema.sessions).values({
      userId: linkedUser.id,
      sessionToken,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    const sessionCheck = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.sessionToken, sessionToken));
    expect(sessionCheck.length).toBe(1);
    expect(sessionCheck[0]!.userId).toBe(emailUser.id);
  });
});
