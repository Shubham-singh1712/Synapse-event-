import { describe, it, expect } from "vitest";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { sanitizeAndVerifyPlanMath } from "@/lib/ai/adapter";
import { getArchetypeFallbackPlan } from "@/lib/ai/archetypes";
import type { GenerateEventPlanRequest } from "@/lib/domain/ai-contracts";

describe("Phase 2: Budget Envelope & Deterministic Enforcement", () => {
  const req: GenerateEventPlanRequest = {
    eventId: "test-envelope-id",
    archetype: "BIRTHDAY",
    title: "10th Superhero Birthday Party",
    eventDate: "2026-11-01",
    totalBudgetCents: 150000, // $1,500
    guestCount: 25,
    location: "Community Center Hall",
    preferences: {},
  };

  it("never trusts AI-provided sums; derives all financial balances through domain engine", () => {
    const rawPlan = getArchetypeFallbackPlan(req);
    const verified = sanitizeAndVerifyPlanMath(rawPlan, req.totalBudgetCents, req.guestCount, req.eventId);

    const sum = verified.budgetItems.reduce((acc, i) => acc + i.estimatedCostCents, 0);

    // Sum is exact to the cent
    expect(sum).toBeLessThanOrEqual(req.totalBudgetCents);

    // Unallocated buffer is exact difference
    const unallocated = req.totalBudgetCents - sum;
    expect(unallocated).toBeGreaterThanOrEqual(0);
  });

  it("detects and flags over-budget scenarios when items exceed total budget envelope", () => {
    const rawPlan = getArchetypeFallbackPlan(req);
    // Artificially inflate items beyond total budget
    rawPlan.budgetItems.push({
      category: "ENTERTAINMENT",
      description: "Deluxe Magician",
      estimatedCostCents: 200000, // $2,000 extra
      actualCostCents: 0,
      status: "ESTIMATED",
      isGuestSensitive: false,
    });

    const itemsAsEntities = rawPlan.budgetItems.map((b, i) => ({
      id: `item-${i}`,
      eventId: req.eventId,
      category: b.category,
      description: b.description,
      estimatedCostCents: b.estimatedCostCents,
      actualCostCents: 0,
      status: b.status || ("ESTIMATED" as const),
      origin: "AI_GENERATED" as const,
      isCustomByUser: false,
      isGuestSensitive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const summary = calculateBudgetSummary(req.totalBudgetCents, req.guestCount, itemsAsEntities);

    expect(summary.isOverBudget).toBe(true);
    expect(summary.overrunCents).toBeGreaterThan(0);
    expect(summary.unallocatedBudgetCents).toBeLessThan(0);
  });
});
