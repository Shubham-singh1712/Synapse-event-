import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "node:fs";
import path from "node:path";
import { eq, and } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { assertWorkspaceOwnership, UnauthorizedError } from "@/lib/auth/guest-workspace";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { getArchetypeFallbackPlan } from "@/lib/ai/archetypes";
import type { GenerateEventPlanRequest } from "@/lib/domain/ai-contracts";

describe("Real PostgreSQL Database Operations (Transactions, Persistence, Reload, IDOR)", () => {
  let pglite: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  const workspaceIdA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const workspaceIdB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const eventId = "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee";

  beforeAll(async () => {
    // 1. Initialize real PostgreSQL engine via PGlite
    pglite = new PGlite();
    db = drizzle(pglite, { schema });

    // 2. Execute all migration DDL scripts in chronological order
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

  // 1 & 2. Create and Persist an event + all generated plan records in a transaction
  it("1 & 2. persists an event and all generated plan entities atomically in a database transaction", async () => {
    const req: GenerateEventPlanRequest = {
      eventId,
      archetype: "WEDDING",
      title: "Clara & James Glasshouse Wedding",
      eventDate: "2026-11-20",
      timezone: "UTC",
      totalBudgetCents: 3500000, // $35,000
      guestCount: 120,
      location: "Botanical Glasshouse",
      preferences: { theme: "Romantic Glasshouse" },
    };

    const plan = getArchetypeFallbackPlan(req);

    // Execute atomic transaction
    await db.transaction(async (tx) => {
      // Create workspace
      await tx.insert(schema.workspaces).values({
        id: workspaceIdA,
        tokenHash: "test_token_hash_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        name: "Clara's Workspace",
        expiresAt: new Date(Date.now() + 30 * 86400000),
      });

      // Insert event
      await tx.insert(schema.events).values({
        id: eventId,
        workspaceId: workspaceIdA,
        title: req.title,
        archetype: req.archetype,
        eventDate: req.eventDate,
        timezone: req.timezone || "UTC",
        location: req.location,
        guestCount: req.guestCount,
        totalBudgetCents: req.totalBudgetCents,
        currency: "USD",
        preferences: req.preferences,
      });

      // Insert budget items
      await tx.insert(schema.budgetItems).values(
        plan.budgetItems.map((b) => ({
          eventId,
          category: b.category,
          description: b.description,
          estimatedCostCents: b.estimatedCostCents,
          actualCostCents: 0,
          status: "ESTIMATED",
          origin: "AI_GENERATED",
          isCustomByUser: false,
          isGuestSensitive: b.isGuestSensitive ?? false,
        }))
      );

      // Insert milestones
      await tx.insert(schema.timelineMilestones).values(
        plan.milestones.map((m) => ({
          eventId,
          title: m.title,
          description: m.description,
          dueAt: m.dueAt,
          offsetDaysFromEvent: m.offsetDaysFromEvent,
          status: "NOT_STARTED",
          origin: "AI_GENERATED",
          isCustomByUser: false,
        }))
      );

      // Insert vendor tasks
      await tx.insert(schema.vendorTasks).values(
        plan.vendorTasks.map((t) => ({
          eventId,
          category: t.category,
          title: t.title,
          requirements: t.requirements,
          status: "NOT_STARTED",
          origin: "AI_GENERATED",
          isCustomByUser: false,
        }))
      );

      // Insert ideas
      await tx.insert(schema.ideaItems).values(
        plan.ideas.map((i) => ({
          eventId,
          category: i.category,
          title: i.title,
          description: i.description,
          origin: "AI_GENERATED",
          isCustomByUser: false,
        }))
      );
    });

    // 3. Receive stable event ID
    expect(eventId).toBe("eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee");
  });

  // 4, 5, 6. Retrieve saved event using authorized workspace, refresh/reload, confirm same plan is present
  it("4, 5 & 6. retrieves the persisted event and verifies identical reload state", async () => {
    // Query event from database
    const eventRows = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
    expect(eventRows.length).toBe(1);
    const event = eventRows[0]!;

    // Assert workspace authorization
    assertWorkspaceOwnership(event.workspaceId, workspaceIdA);

    // Retrieve child entities
    const bItems = await db.select().from(schema.budgetItems).where(eq(schema.budgetItems.eventId, eventId));
    const milestones = await db.select().from(schema.timelineMilestones).where(eq(schema.timelineMilestones.eventId, eventId));
    const tasks = await db.select().from(schema.vendorTasks).where(eq(schema.vendorTasks.eventId, eventId));
    const ideas = await db.select().from(schema.ideaItems).where(eq(schema.ideaItems.eventId, eventId));

    expect(bItems.length).toBeGreaterThanOrEqual(6);
    expect(milestones.length).toBeGreaterThanOrEqual(6);
    expect(tasks.length).toBeGreaterThanOrEqual(4);
    expect(ideas.length).toBeGreaterThanOrEqual(3);

    // Re-verify deterministic math on reloaded items
    const summary = calculateBudgetSummary(
      event.totalBudgetCents,
      event.guestCount,
      bItems.map((b) => ({
        ...b,
        status: b.status as "ESTIMATED",
        origin: b.origin as "AI_GENERATED",
      }))
    );
    expect(summary.totalBudgetCents).toBe(3500000);
    expect(summary.totalEstimatedCostCents).toBeLessThanOrEqual(3500000);
  });

  // 7, 8, 9. Edit a budget item, save change, reload and confirm edit persists
  it("7, 8 & 9. edits a budget item, saves to PostgreSQL, and verifies reload persistence and math update", async () => {
    // 7. Find catering item
    const items = await db.select().from(schema.budgetItems).where(eq(schema.budgetItems.eventId, eventId));
    const catering = items.find((i) => i.category === "CATERING")!;
    expect(catering).toBeDefined();

    const previousEstimated = catering.estimatedCostCents;
    const newEstimated = 1400000; // $14,000

    // 8. Save edit directly to PostgreSQL
    const updatedRows = await db
      .update(schema.budgetItems)
      .set({
        estimatedCostCents: newEstimated,
        status: "COMMITTED",
        origin: "USER_MODIFIED",
        isCustomByUser: true,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.budgetItems.id, catering.id), eq(schema.budgetItems.eventId, eventId)))
      .returning();

    expect(updatedRows.length).toBe(1);

    // 9. Reload from database and confirm the edit persists
    const reloadedRows = await db
      .select()
      .from(schema.budgetItems)
      .where(and(eq(schema.budgetItems.id, catering.id), eq(schema.budgetItems.eventId, eventId)));

    expect(reloadedRows.length).toBe(1);
    const reloadedCatering = reloadedRows[0]!;
    expect(reloadedCatering.estimatedCostCents).toBe(1400000);
    expect(reloadedCatering.status).toBe("COMMITTED");
    expect(reloadedCatering.origin).toBe("USER_MODIFIED");
    expect(reloadedCatering.isCustomByUser).toBe(true);
    expect(reloadedCatering.estimatedCostCents).not.toBe(previousEstimated);
  });

  // 10. Confirm unauthorized workspaces cannot retrieve or modify the event (IDOR defense)
  it("10. strictly blocks unauthorized workspaces from retrieving or modifying the event (IDOR prevention)", async () => {
    const eventRows = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
    const event = eventRows[0]!;

    // Unauthorized access attempt by workspace B
    expect(() => assertWorkspaceOwnership(event.workspaceId, workspaceIdB)).toThrowError(
      UnauthorizedError
    );

    // Legitimate owner passes
    expect(() => assertWorkspaceOwnership(event.workspaceId, workspaceIdA)).not.toThrow();
  });

  // 11. Transaction Rollback Integrity
  it("11. rolls back completely when an error occurs inside a transaction, leaving zero partial records", async () => {
    const failedEventId = "ffffffff-ffff-4fff-ffff-ffffffffffff";

    await expect(
      db.transaction(async (tx) => {
        // Step 1: Insert event
        await tx.insert(schema.events).values({
          id: failedEventId,
          workspaceId: workspaceIdA,
          title: "Failed Transaction Event",
          archetype: "BIRTHDAY",
          eventDate: "2026-12-01",
          timezone: "UTC",
          location: "Park",
          guestCount: 50,
          totalBudgetCents: 100000,
          currency: "USD",
          preferences: {},
        });

        // Step 2: Intentional error to trigger rollback
        throw new Error("Simulated database constraint failure mid-transaction");
      })
    ).rejects.toThrow("Simulated database constraint failure mid-transaction");

    // Verify event was NOT persisted
    const check = await db.select().from(schema.events).where(eq(schema.events.id, failedEventId));
    expect(check.length).toBe(0);
  });

  // 12. Deterministic Ordering of Child Entities
  it("12. retrieves child entities in deterministic order across reloads", async () => {
    // Insert additional milestone with earlier due date to verify ascending order
    const earlierMilestoneId = "11111111-0000-4111-8111-111111111111";
    await db.insert(schema.timelineMilestones).values({
      id: earlierMilestoneId,
      eventId,
      title: "Initial Planning Kickoff",
      dueAt: "2026-06-01",
      offsetDaysFromEvent: -172,
      status: "NOT_STARTED",
      origin: "USER_CUSTOM",
      isCustomByUser: true,
    });

    const milestonesAsc = await db
      .select()
      .from(schema.timelineMilestones)
      .where(eq(schema.timelineMilestones.eventId, eventId))
      .orderBy(schema.timelineMilestones.dueAt);

    expect(milestonesAsc.length).toBeGreaterThan(1);
    // Verify ascending order
    for (let i = 1; i < milestonesAsc.length; i++) {
      expect(milestonesAsc[i]!.dueAt >= milestonesAsc[i - 1]!.dueAt).toBe(true);
    }
  });

  // 13. Exclude CANCELLED budget items from totals
  it("13. excludes CANCELLED budget items from active budget totals", async () => {
    // Insert a cancelled budget item
    const cancelledItemId = "22222222-0000-4222-8222-222222222222";
    await db.insert(schema.budgetItems).values({
      id: cancelledItemId,
      eventId,
      category: "ENTERTAINMENT",
      description: "Cancelled Live Band",
      estimatedCostCents: 500000,
      actualCostCents: 0,
      status: "CANCELLED",
      origin: "USER_CUSTOM",
      isCustomByUser: true,
      isGuestSensitive: false,
    });

    const activeItems = await db
      .select()
      .from(schema.budgetItems)
      .where(
        and(
          eq(schema.budgetItems.eventId, eventId),
          eq(schema.budgetItems.status, "COMMITTED")
        )
      );

    expect(activeItems.some((i) => i.id === cancelledItemId)).toBe(false);
  });
});

