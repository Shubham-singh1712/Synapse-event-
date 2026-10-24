import { describe, it, expect } from "vitest";
import {
  EventSchema,
  CreateEventInputSchema,
  BudgetItemSchema,
  TimelineMilestoneSchema,
  VendorTaskSchema,
  MAX_GUESTS,
  MAX_BUDGET_CENTS,
} from "@/lib/domain/schemas";
import { sampleWeddingEvent, mockEventId } from "../fixtures/event-fixtures";

describe("Domain Schema Contracts & Runtime Validation", () => {
  // 28. Accept valid event archetypes
  it("28. accepts all 3 supported event archetypes (WEDDING, BIRTHDAY, COMMUNITY)", () => {
    const wedding = EventSchema.safeParse({ ...sampleWeddingEvent, archetype: "WEDDING" });
    const birthday = EventSchema.safeParse({ ...sampleWeddingEvent, archetype: "BIRTHDAY" });
    const community = EventSchema.safeParse({ ...sampleWeddingEvent, archetype: "COMMUNITY" });

    expect(wedding.success).toBe(true);
    expect(birthday.success).toBe(true);
    expect(community.success).toBe(true);
  });

  // 29. Reject invalid archetypes
  it("29. rejects unknown or invalid archetypes", () => {
    const invalid = EventSchema.safeParse({
      ...sampleWeddingEvent,
      archetype: "CORPORATE_RETREAT",
    });
    expect(invalid.success).toBe(false);
  });

  // 30. Reject invalid guest counts and monetary values
  it("30. rejects negative guest counts, fractional guests, and negative or oversized budgets", () => {
    // Negative guests
    const negGuests = EventSchema.safeParse({ ...sampleWeddingEvent, guestCount: -5 });
    expect(negGuests.success).toBe(false);

    // Fractional guests
    const floatGuests = EventSchema.safeParse({ ...sampleWeddingEvent, guestCount: 12.5 });
    expect(floatGuests.success).toBe(false);

    // Oversized guests
    const overGuests = EventSchema.safeParse({ ...sampleWeddingEvent, guestCount: MAX_GUESTS + 1 });
    expect(overGuests.success).toBe(false);

    // Negative budget
    const negBudget = EventSchema.safeParse({ ...sampleWeddingEvent, totalBudgetCents: -100 });
    expect(negBudget.success).toBe(false);

    // Oversized budget
    const overBudget = EventSchema.safeParse({
      ...sampleWeddingEvent,
      totalBudgetCents: MAX_BUDGET_CENTS + 1,
    });
    expect(overBudget.success).toBe(false);
  });

  // 31. Reject malformed dates and unknown statuses
  it("31. rejects malformed date strings and unknown status enum values", () => {
    // Malformed date
    const badDate = EventSchema.safeParse({ ...sampleWeddingEvent, eventDate: "20-11-2026" });
    expect(badDate.success).toBe(false);

    // Unknown budget item status
    const badStatus = BudgetItemSchema.safeParse({
      id: "b1111111-1111-4111-a111-111111111111",
      eventId: mockEventId,
      category: "VENUE",
      description: "Hall",
      estimatedCostCents: 1000,
      actualCostCents: 0,
      status: "PENDING_CONFIRMATION", // Invalid status
    });
    expect(badStatus.success).toBe(false);

    // Unknown vendor status
    const badVendorStatus = VendorTaskSchema.safeParse({
      id: "v1111111-1111-4111-a111-111111111111",
      eventId: mockEventId,
      category: "VENUE",
      title: "Contact",
      status: "DONE_AND_FINISHED", // Invalid status
    });
    expect(badVendorStatus.success).toBe(false);
  });

  // 32. Reject oversized input fields
  it("32. rejects oversized strings to prevent denial of service and memory bloat", () => {
    const hugeTitle = "A".repeat(121); // Max is 120
    const badTitle = EventSchema.safeParse({ ...sampleWeddingEvent, title: hugeTitle });
    expect(badTitle.success).toBe(false);

    const hugeDescription = "D".repeat(501); // Max is 500
    const badMilestone = TimelineMilestoneSchema.safeParse({
      id: "m1111111-1111-4111-a111-111111111111",
      eventId: mockEventId,
      title: "Valid Title",
      description: hugeDescription,
      dueAt: "2026-11-20",
    });
    expect(badMilestone.success).toBe(false);
  });

  // 33. Reject unauthorized ownership changes
  it("33. strips or rejects client attempts to assign or tamper with workspace ownership in create inputs", () => {
    // CreateEventInputSchema explicitly omits workspaceId and id so clients cannot supply them
    const clientPayload = {
      title: "Attacker Event",
      archetype: "WEDDING",
      eventDate: "2026-12-01",
      guestCount: 50,
      totalBudgetCents: 100000,
      workspaceId: "hacked-workspace-id", // Injected
      id: "injected-event-id",
    };

    const parsed = CreateEventInputSchema.parse(clientPayload);
    // TypeScript & Zod omit verify that id and workspaceId are not in CreateEventInput
    expect((parsed as Record<string, unknown>).workspaceId).toBeUndefined();
    expect((parsed as Record<string, unknown>).id).toBeUndefined();
  });
});
