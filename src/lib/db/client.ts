import type { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type postgres from "postgres";
import type { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

export class DatabaseConfigurationError extends Error {
  constructor(message = "DATABASE_URL is not configured.") {
    super(
      `${message} Please configure a valid PostgreSQL connection string in .env.local or production environment variables.`
    );
    this.name = "DatabaseConfigurationError";
  }
}

export interface PendingSessionHydration {
  sessionToken: string;
  userId: string;
  email: string;
  name: string;
  expiresAt: number;
}

declare global {
  var __synapse_db__: ReturnType<typeof drizzlePostgres<typeof schema>> | undefined;
  var __synapse_sql__: ReturnType<typeof postgres> | undefined;
  var __synapse_pglite__: PGlite | undefined;
  var __synapse_migrated__: boolean | undefined;
  var __synapse_migration_promise__: Promise<void> | undefined;
  var __synapse_migration_sql__: string | undefined;
  var __synapse_pending_session__: PendingSessionHydration | undefined;
}

/**
 * Loads and caches the combined SQL migration script in memory so cold starts
 * only perform a single batched WASM execution instead of 33 sequential round-trips.
 */
function getCombinedMigrationSql(): string | null {
  if (globalThis.__synapse_migration_sql__ !== undefined) {
    return globalThis.__synapse_migration_sql__ || null;
  }

  const migrationsDir = path.resolve(process.cwd(), "src/lib/db/migrations");
  if (!fs.existsSync(migrationsDir)) {
    globalThis.__synapse_migration_sql__ = "";
    return null;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const chunks: string[] = [];
  for (const file of migrationFiles) {
    const sqlScript = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const cleaned = sqlScript.replace(/--> statement-breakpoint/g, "\n").trim();
    if (cleaned.length > 0) {
      chunks.push(cleaned);
    }
  }

  globalThis.__synapse_migration_sql__ = chunks.join("\n\n");
  return globalThis.__synapse_migration_sql__ || null;
}

/**
 * Executes initial SQL migrations for the embedded local PGlite database.
 */
export async function ensureEmbeddedMigrations(pglite: PGlite): Promise<void> {
  if (globalThis.__synapse_migrated__) {
    return;
  }
  if (globalThis.__synapse_migration_promise__) {
    return globalThis.__synapse_migration_promise__;
  }

  globalThis.__synapse_migration_promise__ = (async () => {
    try {
      const combinedSql = getCombinedMigrationSql();
      if (!combinedSql) {
        globalThis.__synapse_migrated__ = true;
        return;
      }

      const check = await pglite.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';"
      );
      if (check.rows.length === 0) {
        await pglite.exec(combinedSql);
      }
      globalThis.__synapse_migrated__ = true;
    } catch (err) {
      console.error("[PGlite Embedded Migration Error]:", err);
    }
  })();

  return globalThis.__synapse_migration_promise__;
}

export type AppDatabase = ReturnType<typeof drizzlePostgres<typeof schema>>;

/**
 * Returns a typed Drizzle ORM client.
 * Connects to external PostgreSQL if DATABASE_URL is configured,
 * otherwise falls back automatically to an embedded local PGlite PostgreSQL database.
 * Drivers are lazy-loaded on first invocation to minimize serverless cold-start import cost.
 */
export function getDb(): AppDatabase {
  if (globalThis.__synapse_db__) {
    return globalThis.__synapse_db__;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    // 1. Remote or Local PostgreSQL Server (DATABASE_URL provided)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgresDriver = require("postgres") as typeof postgres;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/postgres-js") as {
      drizzle: typeof drizzlePostgres;
    };

    if (!globalThis.__synapse_sql__) {
      globalThis.__synapse_sql__ = postgresDriver(databaseUrl, {
        max: process.env.NODE_ENV === "production" ? 10 : 2,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false, // Required for transaction connection poolers like PgBouncer / Neon
      });
    }

    const db = drizzle(globalThis.__synapse_sql__, { schema });
    globalThis.__synapse_db__ = db;
    return db;
  }

  // 2. Embedded Local PostgreSQL Database (Zero-Setup Option B)
  // Lazy-load PGlite WASM runtime only when embedded database is actually needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite: PGliteRuntime } = require("@electric-sql/pglite") as {
    PGlite: typeof PGlite;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle: drizzlePgliteRuntime } = require("drizzle-orm/pglite") as {
    drizzle: typeof drizzlePglite;
  };

  // In serverless environments (AWS Lambda / Vercel), process.cwd() is /var/task and read-only.
  // When running under Vercel/AWS or when VERCEL=1 or AWS_LAMBDA_FUNCTION_NAME is set, use /tmp/.data/pglite.
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.cwd().startsWith("/var/task");

  let dataDir: string;
  if (isServerless) {
    dataDir = path.resolve("/tmp", ".data/pglite");
    fs.mkdirSync(dataDir, { recursive: true });
  } else {
    try {
      dataDir = path.resolve(process.cwd(), ".data/pglite");
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      dataDir = path.resolve("/tmp", ".data/pglite");
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  if (!globalThis.__synapse_pglite__) {
    globalThis.__synapse_pglite__ = new PGliteRuntime(dataDir);
    ensureEmbeddedMigrations(globalThis.__synapse_pglite__);
  }

  const db = drizzlePgliteRuntime(globalThis.__synapse_pglite__, {
    schema,
  }) as unknown as AppDatabase;
  globalThis.__synapse_db__ = db;
  return db;
}

/**
 * Ensures embedded migrations have finished executing and any deferred
 * verified session is hydrated before database queries run.
 */
export async function ensureDbReady(): Promise<void> {
  const db = getDb();
  if (globalThis.__synapse_pglite__) {
    await ensureEmbeddedMigrations(globalThis.__synapse_pglite__);
  }

  const pending = globalThis.__synapse_pending_session__;
  if (pending) {
    globalThis.__synapse_pending_session__ = undefined;
    try {
      await db
        .insert(schema.users)
        .values({
          id: pending.userId,
          email: pending.email.toLowerCase(),
          name: pending.name,
          passwordHash: `oauth:session:hydrated`,
        })
        .onConflictDoNothing();

      await db
        .insert(schema.sessions)
        .values({
          userId: pending.userId,
          sessionToken: pending.sessionToken,
          expiresAt: new Date(pending.expiresAt),
        })
        .onConflictDoNothing();
    } catch {
      // Ignore concurrent hydration conflicts
    }
  }
}

/**
 * Health check helper to verify database connectivity.
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  provider: "postgres" | "pglite-embedded";
  error?: string;
}> {
  try {
    getDb();
    if (globalThis.__synapse_sql__) {
      await globalThis.__synapse_sql__`SELECT 1`;
      return { connected: true, provider: "postgres" };
    }
    if (globalThis.__synapse_pglite__) {
      await globalThis.__synapse_pglite__.query("SELECT 1;");
      return { connected: true, provider: "pglite-embedded" };
    }
    return { connected: false, provider: "postgres", error: "Database client uninitialized" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database connection error";
    return { connected: false, provider: "postgres", error: message };
  }
}
