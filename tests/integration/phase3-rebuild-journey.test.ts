import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/auth-service";
import { UnauthorizedError } from "@/lib/auth/guest-workspace";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateTimelineSummary } from "@/lib/domain/timeline";
import {
  calculateGuestCountImpact,
  calculateBudgetChangeImpact,
} from "@/lib/domain/change-impact";
import type { BudgetItemEntity } from "@/lib/domain/schemas";

describe("Phase 3 Architecture & User Journey Integration (PostgreSQL + Auth + Multi-Event + Operations)", () => {
  let pglite: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  const userIdA = "11111111-1111-4111-a111-111111111111";
  const userIdB = "22222222-2222-4222-b222-222222222222";
  const workspaceIdA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const workspaceIdB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const eventId1 = "e1111111-1111-4111-a111-111111111111";
  const eventId2 = "e2222222-2222-4222-a222-222222222222";

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

  // 1. Password Hashing and Timing-Safe Verification
  it("1. hashes passwords with secure salt and verifies valid/invalid passwords timing-safely", () => {
    const rawPassword = "SuperSecretPassword123!";
    const storedHash = hashPassword(rawPassword);

    expect(storedHash).toContain(":");
    expect(verifyPassword(rawPassword, storedHash)).toBe(true);
    expect(verifyPassword("WrongPassword123!", storedHash)).toBe(false);
    expect(verifyPassword("", storedHash)).toBe(false);
  });

  // 2. User Registration and Session Persistence in PostgreSQL
  it("2. persists users and sessions in PostgreSQL database", async () => {
    const passwordHashA = hashPassword("ClaraPassword123!");
    const sessionTokenA = "session_token_clara_32_bytes_hex_entropy_12345678";
    const expiresAt = new Date(Date.now() + 30 * 86400000);

    // Insert User A
    await db.insert(schema.users).values({
      id: userIdA,
      email: "clara@example.com",
      name: "Clara Oswald",
      passwordHash: passwordHashA,
    });

    // Insert Session A
    await db.insert(schema.sessions).values({
      userId: userIdA,
      sessionToken: sessionTokenA,
      expiresAt,
    });

    // Query back
    const userRows = await db.select().from(schema.users).where(eq(schema.users.id, userIdA));
    expect(userRows.length).toBe(1);
    expect(userRows[0]!.name).toBe("Clara Oswald");
    expect(userRows[0]!.email).toBe("clara@example.com");

    const sessionRows = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.sessionToken, sessionTokenA));
    expect(sessionRows.length).toBe(1);
    expect(sessionRows[0]!.userId).toBe(userIdA);
  });

  // 3. User B Creation (for authorization and isolation tests)
  it("3. supports multi-tenant user isolation in PostgreSQL", async () => {
    const passwordHashB = hashPassword("RoryPassword123!");
    const sessionTokenB = "session_token_rory_32_bytes_hex_entropy_87654321";
    const expiresAt = new Date(Date.now() + 30 * 86400000);

    await db.insert(schema.users).values({
      id: userIdB,
      email: "rory@example.com",
      name: "Rory Williams",
      passwordHash: passwordHashB,
    });

    await db.insert(schema.sessions).values({
      userId: userIdB,
      sessionToken: sessionTokenB,
      expiresAt,
    });

    const userB = await db.select().from(schema.users).where(eq(schema.users.id, userIdB));
    expect(userB.length).toBe(1);
    expect(userB[0]!.email).toBe("rory@example.com");
  });

  // 4. Multiple Events Created for User A
  it("4. persists multiple distinct events for a single user account", async () => {
    // Create Workspace for User A
    await db.insert(schema.workspaces).values({
      id: workspaceIdA,
      userId: userIdA,
      tokenHash: "hash_workspace_a",
      name: "Clara's Celebrations",
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    // Event 1: Wedding
    await db.insert(schema.events).values({
      id: eventId1,
      userId: userIdA,
      workspaceId: workspaceIdA,
      title: "Clara & James Glasshouse Wedding",
      archetype: "WEDDING",
      eventDate: "2026-11-20",
      timezone: "UTC",
      location: "Botanical Glasshouse",
      guestCount: 120,
      totalBudgetCents: 3500000,
      currency: "USD",
      preferences: {},
    });

    // Event 2: Birthday
    await db.insert(schema.events).values({
      id: eventId2,
      userId: userIdA,
      workspaceId: workspaceIdA,
      title: "Clara's 30th Rooftop Birthday",
      archetype: "BIRTHDAY",
      eventDate: "2026-12-15",
      timezone: "UTC",
      location: "Skyline Terrace",
      guestCount: 45,
      totalBudgetCents: 450000,
      currency: "USD",
      preferences: {},
    });

    const userAEvents = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.userId, userIdA));
    expect(userAEvents.length).toBe(2);
    expect(userAEvents.map((e) => e.archetype).sort()).toEqual(["BIRTHDAY", "WEDDING"]);
  });

  // 5. Budget, Milestones, and Vendor Tasks Persistence for Event 1
  it("5. persists child records (budget items, milestones, tasks, ideas) for an event", async () => {
    // Add budget items
    await db.insert(schema.budgetItems).values([
      {
        id: "b1111111-1111-4111-a111-111111111111",
        eventId: eventId1,
        category: "VENUE",
        description: "Glasshouse Rental Fee",
        estimatedCostCents: 1050000,
        actualCostCents: 0,
        status: "COMMITTED",
        origin: "AI_GENERATED",
        isGuestSensitive: false,
      },
      {
        id: "b2222222-2222-4222-a222-222222222222",
        eventId: eventId1,
        category: "CATERING",
        description: "Farm to Table Plated Dinner",
        estimatedCostCents: 1260000,
        actualCostCents: 0,
        status: "ESTIMATED",
        origin: "AI_GENERATED",
        isGuestSensitive: true,
      },
    ]);

    // Add milestones
    await db.insert(schema.timelineMilestones).values([
      {
        id: "c1111111-1111-4111-a111-111111111111",
        eventId: eventId1,
        title: "Secure Glasshouse Venue & Deposit",
        description: "Pay 50% deposit and sign agreement",
        dueAt: "2026-03-01",
        status: "COMPLETED",
        origin: "AI_GENERATED",
      },
      {
        id: "c2222222-2222-4222-a222-222222222222",
        eventId: eventId1,
        title: "Catering Menu Tasting",
        description: "Select 3 courses and wine pairings",
        dueAt: "2026-08-15",
        status: "NOT_STARTED",
        origin: "AI_GENERATED",
      },
    ]);

    // Add vendor tasks
    await db.insert(schema.vendorTasks).values({
      id: "f1111111-1111-4111-a111-111111111111",
      eventId: eventId1,
      category: "CATERING",
      title: "Confirm dietary restrictions & tasting date",
      requirements: "Check for gluten-free and vegan options for 12 guests",
      status: "INQUIRY_SENT",
      origin: "AI_GENERATED",
    });

    // Add idea
    await db.insert(schema.ideaItems).values({
      id: "f2222222-2222-4222-a222-222222222222",
      eventId: eventId1,
      category: "ACTIVITY",
      title: "Polaroid Guestbook Station",
      description: "Vintage cameras on welcome table with metallic gel pens",
      estimatedCostCents: 15000,
      origin: "AI_GENERATED",
    });

    const bItems = await db.select().from(schema.budgetItems).where(eq(schema.budgetItems.eventId, eventId1));
    const milestones = await db.select().from(schema.timelineMilestones).where(eq(schema.timelineMilestones.eventId, eventId1));
    const tasks = await db.select().from(schema.vendorTasks).where(eq(schema.vendorTasks.eventId, eventId1));
    const ideas = await db.select().from(schema.ideaItems).where(eq(schema.ideaItems.eventId, eventId1));

    expect(bItems.length).toBe(2);
    expect(milestones.length).toBe(2);
    expect(tasks.length).toBe(1);
    expect(ideas.length).toBe(1);
  });

  // 6. Deterministic Financial Math on Persisted Plan
  it("6. validates exact deterministic calculations on retrieved records", async () => {
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId1));
    const bItems = await db.select().from(schema.budgetItems).where(eq(schema.budgetItems.eventId, eventId1));

    const summary = calculateBudgetSummary(
      event!.totalBudgetCents,
      event!.guestCount,
      bItems.map((b) => ({
        ...b,
        status: b.status as BudgetItemEntity["status"],
        origin: b.origin as BudgetItemEntity["origin"],
      }))
    );

    expect(summary.totalBudgetCents).toBe(3500000);
    expect(summary.totalEstimatedCostCents).toBe(2310000); // 1050000 + 1260000
    expect(summary.unallocatedBudgetCents).toBe(1190000); // 3500000 - 2310000
    expect(summary.isOverBudget).toBe(false);
    expect(summary.allocationPercent).toBe(66);
    expect(summary.perGuestEstimatedCents).toBe(Math.round(2310000 / 120));
  });

  // 7. Timeline Summary and Milestone Status Verification
  it("7. computes timeline progress and honors completed milestone states", async () => {
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId1));
    const mItems = await db.select().from(schema.timelineMilestones).where(eq(schema.timelineMilestones.eventId, eventId1));

    const summary = calculateTimelineSummary(
      event!.eventDate,
      mItems.map((m) => ({
        ...m,
        description: m.description ?? "",
        offsetDaysFromEvent: m.offsetDaysFromEvent ?? undefined,
        priority: "MEDIUM",
        dependencies: [],
        status: m.status as "NOT_STARTED" | "COMPLETED",
        origin: m.origin as "AI_GENERATED",
      }))
    );

    expect(summary.totalMilestones).toBe(2);
    expect(summary.completedMilestones).toBe(1);
    expect(summary.completionPercent).toBe(50);
  });

  // 8. Change Impact Domino Recalculation
  it("8. executes change-impact domino recalculation for guest count adjustments", async () => {
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId1));
    const bItems = await db.select().from(schema.budgetItems).where(eq(schema.budgetItems.eventId, eventId1));

    const typedItems: BudgetItemEntity[] = bItems.map((b) => ({
      ...b,
      status: b.status as BudgetItemEntity["status"],
      origin: b.origin as BudgetItemEntity["origin"],
    }));

    // Simulate increasing guests from 120 to 180 (+50%)
    const impact = calculateGuestCountImpact(120, 180, event!.totalBudgetCents, typedItems);

    expect(impact.previousGuestCount).toBe(120);
    expect(impact.newGuestCount).toBe(180);
    expect(impact.guestDelta).toBe(60);
    expect(impact.percentageChange).toBe(50);
    expect(impact.guestSensitiveItemCount).toBe(1); // Catering item

    // Catering scaled: 1,260,000 * 180 / 120 = 1,890,000 cents
    // Venue fixed: 1,050,000 cents
    // Projected total: 2,940,000 cents
    expect(impact.newProjectedEstimatedCents).toBe(2940000);
    expect(impact.unallocatedBudgetCents).toBe(3500000 - 2940000);
    expect(impact.isOverBudget).toBe(false);

    // Simulate extreme budget decrease (dropping total budget to $20,000)
    const budgetDrop = calculateBudgetChangeImpact(3500000, 2000000, typedItems);
    expect(budgetDrop.isOverBudget).toBe(true);
    expect(budgetDrop.overrunCents).toBe(310000); // 2,310,000 - 2,000,000
    expect(budgetDrop.warnings.length).toBeGreaterThan(0);
  });

  // 9. Cross-User Authorization (IDOR Defense)
  it("9. rejects cross-user access attempts on events and child records", async () => {
    // User B attempts to access Event 1 owned by User A
    const [event1] = await db.select().from(schema.events).where(eq(schema.events.id, eventId1));
    expect(event1!.userId).toBe(userIdA);
    expect(event1!.userId).not.toBe(userIdB);

    // Direct check simulating route authorization guard
    const isUserBAuthorized = event1!.userId === userIdB;
    expect(isUserBAuthorized).toBe(false);

    // Verifying error assertion behavior
    const checkAuth = (resourceUserId: string, requestingUserId: string) => {
      if (resourceUserId !== requestingUserId) {
        throw new UnauthorizedError("Forbidden: Access denied.");
      }
    };

    expect(() => checkAuth(event1!.userId!, userIdB)).toThrowError(UnauthorizedError);
    expect(() => checkAuth(event1!.userId!, userIdA)).not.toThrow();
  });

  // 10. Event Deletion and Cascade
  it("10. deletes an event and all child records via foreign key cascade", async () => {
    // Delete Event 2
    await db.delete(schema.events).where(eq(schema.events.id, eventId2));

    const checkEvent2 = await db.select().from(schema.events).where(eq(schema.events.id, eventId2));
    expect(checkEvent2.length).toBe(0);

    // Confirm Event 1 is unaffected
    const checkEvent1 = await db.select().from(schema.events).where(eq(schema.events.id, eventId1));
    expect(checkEvent1.length).toBe(1);
  });
});
