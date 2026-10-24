import { describe, it, expect } from "vitest";
import { CreateEventInputSchema, validateEventDate } from "@/lib/domain/schemas";
import { generateEventPlan } from "@/lib/ai/adapter";

describe("Phase 2: Event Creation User Journeys", () => {
  // 1. Birthday Journey
  it("successfully creates and generates a Birthday Event plan", async () => {
    const input = {
      title: "Leo's 30th Rooftop Birthday",
      archetype: "BIRTHDAY" as const,
      eventDate: "2026-11-20",
      timezone: "UTC",
      location: "Skyline Lounge",
      totalBudgetCents: 300000, // $3,000
      currency: "USD",
      guestCount: 40,
      preferences: { theme: "Retro 80s Arcade", priorities: "Great craft cocktails and custom cake" },
    };

    const parsed = CreateEventInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);

    const dateCheck = validateEventDate(input.eventDate, "2026-10-21");
    expect(dateCheck.isValid).toBe(true);

    const result = await generateEventPlan({
      eventId: "bday-event-id",
      ...input,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plan.budgetItems.some((b) => b.description.includes("Cake"))).toBe(true);
      expect(result.plan.ideas.length).toBeGreaterThan(0);
      expect(result.mode).toBe("TEMPLATE_GENERATED"); // No key configured in test env
    }
  });

  // 2. Wedding Journey
  it("successfully creates and generates a Wedding Event plan", async () => {
    const input = {
      title: "Ava & Noah's Autumn Vineyard Wedding",
      archetype: "WEDDING" as const,
      eventDate: "2026-10-25",
      timezone: "America/New_York",
      location: "Napa Valley Estate",
      totalBudgetCents: 5000000, // $50,000
      currency: "USD",
      guestCount: 120,
      preferences: { theme: "Rustic Chic", priorities: "Live jazz band and organic farm-to-table dinner" },
    };

    const parsed = CreateEventInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);

    const result = await generateEventPlan({
      eventId: "wedding-event-id",
      ...input,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plan.budgetItems.some((b) => b.category === "VENUE")).toBe(true);
      expect(result.plan.milestones.some((m) => m.title.includes("Venue & Deposit"))).toBe(true);
      expect(result.plan.assumptions.budgetAssumptions.length).toBeGreaterThan(0);
    }
  });

  // 3. Community Event Journey
  it("successfully creates and generates a Community Event plan", async () => {
    const input = {
      title: "Downtown Spring Street Fair & Music Festival",
      archetype: "COMMUNITY" as const,
      eventDate: "2027-05-15",
      timezone: "America/Chicago",
      location: "City Central Plaza",
      totalBudgetCents: 1500000, // $15,000
      currency: "USD",
      guestCount: 800,
      preferences: { theme: "Multicultural Arts & Local Foods", priorities: "Public safety and zero waste" },
    };

    const parsed = CreateEventInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);

    const result = await generateEventPlan({
      eventId: "community-event-id",
      ...input,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.plan.budgetItems.some((b) => b.category === "PERMITS_LOGISTICS")).toBe(true);
      expect(result.plan.vendorTasks.some((t) => t.title.includes("Permit"))).toBe(true);
      expect(
        result.plan.assumptions.locationSpecificUncertainties.some((u) =>
          u.includes("Municipal permit")
        )
      ).toBe(true);
    }
  });

  // 4. Input validation: Rejection of past dates
  it("rejects event dates in the past according to documented validation policy", () => {
    const pastDateCheck = validateEventDate("2020-01-01", "2026-10-21");
    expect(pastDateCheck.isValid).toBe(false);
    expect(pastDateCheck.error).toContain("Event date cannot be in the past");
  });

  // 5. Input validation: Rejection of negative budget or invalid archetypes
  it("rejects negative budgets and unsupported event archetypes", () => {
    const invalidBudget = CreateEventInputSchema.safeParse({
      title: "Invalid Budget Event",
      archetype: "BIRTHDAY",
      eventDate: "2026-11-01",
      totalBudgetCents: -5000,
      guestCount: 10,
    });
    expect(invalidBudget.success).toBe(false);

    const invalidArchetype = CreateEventInputSchema.safeParse({
      title: "Corporate Meeting",
      archetype: "CORPORATE_RETREAT",
      eventDate: "2026-11-01",
      totalBudgetCents: 10000,
      guestCount: 10,
    });
    expect(invalidArchetype.success).toBe(false);
  });
});
