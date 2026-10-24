import { describe, it, expect } from "vitest";
import {
  calculateGuestCountImpact,
  calculateBudgetChangeImpact,
  calculateEventDateImpact,
} from "@/lib/domain/change-impact";
import {
  reconcileBudgetItems,
  reconcileMilestones,
  reconcileVendorTasks,
} from "@/lib/domain/plan-mutations";
import {
  sampleBudgetItems,
  sampleMilestones,
  sampleVendorTasks,
  mockEventId,
} from "../fixtures/event-fixtures";
import type {
  BudgetItemEntity,
  TimelineMilestoneEntity,
  VendorTaskEntity,
} from "@/lib/domain/schemas";

describe("Domain Change-Impact & User-Edit Preservation", () => {
  const totalBudgetCents = 3500000; // $35,000

  // 19. Calculate a guest-count increase accurately
  it("19. calculates guest-count increase accurately and scales guest-sensitive items", () => {
    // Current guests: 120, New guests: 150 (+25%)
    // Catering item is guest sensitive ($12,000 for 120 guests = $100/guest).
    // At 150 guests, catering becomes $15,000 ($150 * 100).
    // Total estimated increases from $29,500 to $32,500. Still within $35,000 budget.
    const impact = calculateGuestCountImpact(120, 150, totalBudgetCents, sampleBudgetItems);

    expect(impact.previousGuestCount).toBe(120);
    expect(impact.newGuestCount).toBe(150);
    expect(impact.guestDelta).toBe(30);
    expect(impact.percentageChange).toBe(25);
    expect(impact.guestSensitiveItemCount).toBe(1);
    expect(impact.newProjectedEstimatedCents).toBe(3250000); // $32,500
    expect(impact.isOverBudget).toBe(false);
    expect(impact.unallocatedBudgetCents).toBe(250000); // $2,500 remaining
  });

  // 20. Calculate a guest-count decrease accurately
  it("20. calculates guest-count decrease accurately and reflects freed budget buffer", () => {
    // Guests reduced from 120 to 60 (-50%)
    // Catering becomes $6,000 instead of $12,000
    // Total estimated drops from $29,500 to $23,500
    const impact = calculateGuestCountImpact(120, 60, totalBudgetCents, sampleBudgetItems);

    expect(impact.guestDelta).toBe(-60);
    expect(impact.percentageChange).toBe(-50);
    expect(impact.newProjectedEstimatedCents).toBe(2350000); // $23,500
    expect(impact.unallocatedBudgetCents).toBe(1150000); // $11,500
    expect(impact.isOverBudget).toBe(false);
    expect(impact.warnings.some((w) => w.includes("unallocated capacity"))).toBe(true);
  });

  // 21. Calculate a budget increase accurately
  it("21. calculates budget increase accurately", () => {
    // Budget increased from $35,000 to $45,000
    const impact = calculateBudgetChangeImpact(3500000, 4500000, sampleBudgetItems);

    expect(impact.previousBudgetCents).toBe(3500000);
    expect(impact.newBudgetCents).toBe(4500000);
    expect(impact.budgetDeltaCents).toBe(1000000);
    expect(impact.percentageChange).toBe(28.6);
    expect(impact.unallocatedBudgetCents).toBe(1550000); // $15,500 unallocated
    expect(impact.isOverBudget).toBe(false);
  });

  // 22. Calculate a budget reduction that creates an overrun
  it("22. calculates a budget reduction that creates an overrun and flags deficit", () => {
    // Budget cut from $35,000 to $25,000 (total current allocations: $29,500)
    const impact = calculateBudgetChangeImpact(3500000, 2500000, sampleBudgetItems, "USD");

    expect(impact.budgetDeltaCents).toBe(-1000000);
    expect(impact.isOverBudget).toBe(true);
    expect(impact.overrunCents).toBe(450000); // $4,500 deficit
    expect(impact.deficitCents).toBe(450000);
    expect(impact.requiresUserReview).toBe(true);
    expect(impact.warnings.some((w) => w.includes("deficit of $4,500.00"))).toBe(true);
  });

  // 23. Preserve user-created budget items
  it("23. preserves user-created budget items during plan reconciliation", () => {
    const incomingAiItems: BudgetItemEntity[] = [
      {
        id: "new-ai-1",
        eventId: mockEventId,
        category: "ENTERTAINMENT",
        description: "Standard Wedding DJ Package",
        estimatedCostCents: 150000,
        actualCostCents: 0,
        status: "ESTIMATED",
        origin: "AI_GENERATED",
        isCustomByUser: false,
        isGuestSensitive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = reconcileBudgetItems(sampleBudgetItems, incomingAiItems);

    // b3333333 is USER_CUSTOM ("Live 5-Piece Jazz Band")
    const preservedUserBand = result.reconciledItems.find(
      (item) => item.description === "Live 5-Piece Jazz Band"
    );
    expect(preservedUserBand).toBeDefined();
    expect(preservedUserBand?.isCustomByUser).toBe(true);
    expect(preservedUserBand?.origin).toBe("USER_CUSTOM");
    expect(result.preservedUserCustomCount).toBeGreaterThanOrEqual(1);
  });

  // 24. Preserve user-modified items
  it("24. preserves user-modified items and ignores AI overwrite attempts", () => {
    const existingWithModified: BudgetItemEntity[] = [
      {
        id: "mod-1",
        eventId: mockEventId,
        category: "PHOTOGRAPHY_VIDEO",
        description: "Bespoke Photo Package",
        estimatedCostCents: 500000,
        actualCostCents: 500000,
        status: "COMMITTED",
        origin: "USER_MODIFIED",
        isCustomByUser: false,
        isGuestSensitive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const incomingAiItems: BudgetItemEntity[] = [
      {
        id: "ai-overwrite",
        eventId: mockEventId,
        category: "PHOTOGRAPHY_VIDEO",
        description: "Bespoke Photo Package",
        estimatedCostCents: 200000, // Attempted overwrite to $2,000
        actualCostCents: 0,
        status: "ESTIMATED",
        origin: "AI_GENERATED",
        isCustomByUser: false,
        isGuestSensitive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = reconcileBudgetItems(existingWithModified, incomingAiItems);
    const item = result.reconciledItems.find((i) => i.description === "Bespoke Photo Package");
    expect(item?.estimatedCostCents).toBe(500000); // Preserved user's $5,000 price
    expect(item?.status).toBe("COMMITTED");
    expect(result.warnings.some((w) => w.includes("Preserved user-modified budget item"))).toBe(true);
  });

  // 25. Preserve completed milestones and tasks
  it("25. preserves completed milestones and vendor tasks without resetting status", () => {
    const incomingAiMilestones: TimelineMilestoneEntity[] = [
      {
        id: "ai-milestone-1",
        eventId: mockEventId,
        title: "Secure Venue & Date", // Matches sampleMilestones[0] which is COMPLETED
        description: "Book venue now",
        dueAt: "2026-07-01",
        status: "NOT_STARTED", // AI suggests resetting to NOT_STARTED
        origin: "AI_GENERATED",
        isCustomByUser: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const milestoneResult = reconcileMilestones(sampleMilestones, incomingAiMilestones);
    const venueMilestone = milestoneResult.reconciledItems.find(
      (m) => m.title === "Secure Venue & Date"
    );
    expect(venueMilestone?.status).toBe("COMPLETED"); // Remains COMPLETED!
    expect(milestoneResult.preservedCompletedCount).toBeGreaterThanOrEqual(1);

    // Vendor Tasks
    const incomingAiTasks: VendorTaskEntity[] = [
      {
        id: "ai-task-1",
        eventId: mockEventId,
        category: "VENUE",
        title: "Confirm Load-in Window with Venue Manager", // Matches sampleVendorTasks[0] (COMPLETED)
        requirements: "Reset reqs",
        status: "NOT_STARTED",
        origin: "AI_GENERATED",
        isCustomByUser: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const taskResult = reconcileVendorTasks(sampleVendorTasks, incomingAiTasks);
    const venueTask = taskResult.reconciledItems.find(
      (t) => t.title === "Confirm Load-in Window with Venue Manager"
    );
    expect(venueTask?.status).toBe("COMPLETED");
  });

  // 26. Return explicit warnings for potentially destructive changes
  it("26. returns explicit warnings when event date shift compresses lead time or causes overdue milestones", () => {
    // Event shifted from 2026-11-20 to 2026-09-01 (moved sooner by 80 days)
    const impact = calculateEventDateImpact(
      "2026-11-20",
      "2026-09-01",
      sampleMilestones,
      "2026-08-01"
    );

    expect(impact.shiftDays).toBe(-80);
    expect(impact.compressedLeadTime).toBe(true);
    expect(impact.requiresUserReview).toBe(true);
    expect(impact.warnings.some((w) => w.includes("moved sooner by 80 days"))).toBe(true);
    expect(impact.proposedMilestoneDateChanges.length).toBe(3);
  });

  // 27. Do not invent missing cost assumptions
  it("27. does NOT invent unknown venue capacity or catering rates when attributes are missing", () => {
    const fixedOnlyItems: BudgetItemEntity[] = [
      {
        ...sampleBudgetItems[0]!,
        isGuestSensitive: false, // Not marked guest sensitive
      },
    ];

    // Scaling guests with no guest-sensitive items returns clean warning without fabricating numbers
    const impact = calculateGuestCountImpact(50, 150, 1000000, fixedOnlyItems);
    expect(impact.guestSensitiveItemCount).toBe(0);
    expect(impact.newProjectedEstimatedCents).toBe(fixedOnlyItems[0]!.estimatedCostCents); // Fixed items unchanged
    expect(
      impact.warnings.some((w) =>
        w.includes("No budget line items are currently marked as guest-sensitive")
      )
    ).toBe(true);
  });
});
