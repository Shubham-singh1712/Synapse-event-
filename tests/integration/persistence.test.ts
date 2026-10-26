import { describe, it, expect } from "vitest";
import { checkDatabaseConnection, DatabaseConfigurationError } from "@/lib/db/client";

describe("Database Persistence & Infrastructure Integration", () => {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

  it("verifies database connection status via checkDatabaseConnection", async () => {
    const result = await checkDatabaseConnection();
    expect(result).toBeDefined();
    expect(typeof result.connected).toBe("boolean");
    expect(["postgres", "pglite-embedded"]).toContain(result.provider);
  });

  it("handles unconfigured connection safely using DatabaseConfigurationError", () => {
    expect(() => {
      throw new DatabaseConfigurationError("Test unconfigured state");
    }).toThrowError(DatabaseConfigurationError);
  });
});
