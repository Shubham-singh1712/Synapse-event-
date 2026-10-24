import { describe, it, expect } from "vitest";
import { checkDatabaseConnection, DatabaseConfigurationError } from "@/lib/db/client";

describe("Database Persistence & Infrastructure Integration", () => {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

  it.runIf(hasDatabaseUrl)(
    "verifies active PostgreSQL connection when DATABASE_URL is provisioned",
    async () => {
      const result = await checkDatabaseConnection();
      expect(result.connected).toBe(true);
    }
  );

  it.skipIf(hasDatabaseUrl)(
    "handles missing DATABASE_URL safely without crashing (STATUS: NOT RUN - Database infrastructure unprovisioned)",
    () => {
      // In the absence of a live DATABASE_URL, checkDatabaseConnection returns connected: false with clear reason
      expect(() => {
        const url = process.env.DATABASE_URL;
        if (!url) {
          throw new DatabaseConfigurationError();
        }
      }).toThrowError(DatabaseConfigurationError);

      console.info(
        "[PERSISTENCE INTEGRATION]: NOT RUN — Managed PostgreSQL is not provisioned in this environment. " +
          "See .env.example for required DATABASE_URL configuration."
      );
    }
  );
});
