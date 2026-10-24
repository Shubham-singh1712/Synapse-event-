import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
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

// Global singletons across development hot reloads
declare global {
  var __synapse_db__: ReturnType<typeof drizzlePostgres<typeof schema>> | undefined;
  var __synapse_sql__: ReturnType<typeof postgres> | undefined;
  var __synapse_pglite__: PGlite | undefined;
  var __synapse_migrated__: boolean | undefined;
}

/**
 * Executes initial SQL migrations for the embedded local PGlite database.
 */
function runEmbeddedMigrationsSync(pglite: PGlite): void {
  if (globalThis.__synapse_migrated__) {
    return;
  }

  // Queue initial migration scripts in PGlite
  const migrationsDir = path.resolve(process.cwd(), "src/lib/db/migrations");
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  // Execute each migration file sequentially
  (async () => {
    try {
      // Check if users table already exists to avoid re-running migrations
      const check = await pglite.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';"
      );
      if (check.rows.length === 0) {
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
      }
      globalThis.__synapse_migrated__ = true;
    } catch (err) {
      console.error("[PGlite Embedded Migration Error]:", err);
    }
  })();
}

export type AppDatabase = ReturnType<typeof drizzlePostgres<typeof schema>>;

/**
 * Returns a typed Drizzle ORM client.
 * Connects to external PostgreSQL if DATABASE_URL is configured,
 * otherwise falls back automatically to an embedded local PGlite PostgreSQL database.
 */
export function getDb(): AppDatabase {
  if (globalThis.__synapse_db__) {
    return globalThis.__synapse_db__;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    // 1. Remote or Local PostgreSQL Server (DATABASE_URL provided)
    if (!globalThis.__synapse_sql__) {
      globalThis.__synapse_sql__ = postgres(databaseUrl, {
        max: process.env.NODE_ENV === "production" ? 10 : 2,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false, // Required for transaction connection poolers like PgBouncer / Neon
      });
    }

    const db = drizzlePostgres(globalThis.__synapse_sql__, { schema });
    globalThis.__synapse_db__ = db;
    return db;
  }

  // 2. Embedded Local PostgreSQL Database (Zero-Setup Option B)
  const dataDir = path.resolve(process.cwd(), ".data/pglite");
  fs.mkdirSync(dataDir, { recursive: true });

  if (!globalThis.__synapse_pglite__) {
    globalThis.__synapse_pglite__ = new PGlite(dataDir);
    runEmbeddedMigrationsSync(globalThis.__synapse_pglite__);
  }

  const db = drizzlePglite(globalThis.__synapse_pglite__, { schema }) as unknown as AppDatabase;
  globalThis.__synapse_db__ = db;
  return db;
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
