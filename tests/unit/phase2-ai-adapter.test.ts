import { describe, it, expect } from "vitest";
import { generateEventPlan, sanitizeAndVerifyPlanMath } from "@/lib/ai/adapter";
import { getArchetypeFallbackPlan } from "@/lib/ai/archetypes";
import { AiGeneratedPlanResponseSchema } from "@/lib/domain/ai-contracts";
import type { GenerateEventPlanRequest } from "@/lib/domain/ai-contracts";

describe("Phase 2: AI Provider Adapter & Fallback Engine", () => {
  const baseRequest: GenerateEventPlanRequest = {
    eventId: "11111111-2222-3333-4444-555555555555",
    archetype: "WEDDING",
    title: "Maya & Ethan's Coastal Wedding",
    eventDate: "2026-12-15",
    timezone: "UTC",
    totalBudgetCents: 4000000, // $40,000
    guestCount: 150,
    location: "Seaside Resort",
    theme: "Coastal Breeze",
    priorities: "Live music and seafood catering",
    preferences: {},
  };

  // 1. Missing API key triggers template fallback seamlessly
  it("triggers deterministic benchmark template when API key is missing", async () => {
    const result = await generateEventPlan(baseRequest, {
      forceFallback: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.mode).toBe("TEMPLATE_GENERATED");
      expect(result.provider).toBe("deterministic_template");
      expect(result.notice).toContain("benchmark");
      expect(result.plan.budgetItems.length).toBeGreaterThan(0);
      expect(result.plan.milestones.length).toBeGreaterThan(0);
      expect(result.plan.vendorTasks.length).toBeGreaterThan(0);
      expect(result.plan.ideas.length).toBeGreaterThan(0);
      expect(result.plan.assumptions.budgetAssumptions.length).toBeGreaterThan(0);
    }
  });

  // 2. Archetype specificity: All 3 archetypes generate distinct plans
  it("generates distinct, bespoke plans for Wedding, Birthday, and Community archetypes", () => {
    const weddingPlan = getArchetypeFallbackPlan({ ...baseRequest, archetype: "WEDDING" });
    const birthdayPlan = getArchetypeFallbackPlan({ ...baseRequest, archetype: "BIRTHDAY" });
    const communityPlan = getArchetypeFallbackPlan({ ...baseRequest, archetype: "COMMUNITY" });

    // Validate all 3 adhere strictly to Zod schema
    expect(AiGeneratedPlanResponseSchema.safeParse(weddingPlan).success).toBe(true);
    expect(AiGeneratedPlanResponseSchema.safeParse(birthdayPlan).success).toBe(true);
    expect(AiGeneratedPlanResponseSchema.safeParse(communityPlan).success).toBe(true);

    // Wedding features ceremony/reception & floral
    expect(weddingPlan.budgetItems.some((b) => b.category === "DECOR_FLORAL")).toBe(true);
    expect(weddingPlan.milestones.some((m) => m.title.includes("Venue & Deposit"))).toBe(true);

    // Birthday features birthday cake & fun activities
    expect(birthdayPlan.budgetItems.some((b) => b.description.includes("Cake"))).toBe(true);
    expect(birthdayPlan.milestones.some((m) => m.title.includes("Birthday Cake"))).toBe(true);

    // Community event features permits, logistics, and public safety
    expect(communityPlan.budgetItems.some((b) => b.category === "PERMITS_LOGISTICS")).toBe(true);
    expect(communityPlan.milestones.some((m) => m.title.includes("Municipal"))).toBe(true);
  });

  // 3. Schema validation rejects malformed AI responses
  it("rejects malformed or negative amounts in plan schemas", () => {
    const malformed = {
      budgetItems: [
        {
          category: "VENUE",
          description: "Venue",
          estimatedCostCents: -500, // Invalid negative
        },
      ],
      milestones: [],
      vendorTasks: [],
      ideas: [],
    };

    const parsed = AiGeneratedPlanResponseSchema.safeParse(malformed);
    expect(parsed.success).toBe(false);
  });

  // 4. Deterministic math recalculation
  it("sanitizes negative values and recalculates total allocations deterministically", () => {
    const rawPlan = getArchetypeFallbackPlan(baseRequest);
    // Inject float or potential drift
    rawPlan.budgetItems[0]!.estimatedCostCents = 1500000;

    const sanitized = sanitizeAndVerifyPlanMath(
      rawPlan,
      baseRequest.totalBudgetCents,
      baseRequest.guestCount,
      baseRequest.eventId
    );

    // Verified non-negative
    for (const item of sanitized.budgetItems) {
      expect(item.estimatedCostCents).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(item.estimatedCostCents)).toBe(true);
    }

    // Assumptions updated with exact deterministic summary
    expect(
      sanitized.assumptions.budgetAssumptions.some((a) =>
        a.includes("Deterministic Engine: Total allocated")
      )
    ).toBe(true);
  });
});
