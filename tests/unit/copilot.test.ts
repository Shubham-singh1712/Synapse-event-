import { describe, it, expect } from "vitest";
import {
  buildEventGroundingContext,
  generateDeterministicCopilotAdvice,
} from "@/lib/ai/copilot";
import {
  CopilotChatRequestSchema,
  CopilotChatResponseSchema,
} from "@/lib/domain/copilot-contracts";
import type { CompleteEventPlan } from "@/lib/services/event-service";

describe("AI Celebration Copilot & Context Grounding Tests", () => {
  const mockEvent = {
    id: "11111111-1111-4111-a111-111111111111",
    workspaceId: "ws-123",
    title: "Aarav's 1st Birthday Bash",
    archetype: "BIRTHDAY" as const,
    eventDate: "2026-11-20",
    timezone: "Asia/Kolkata",
    location: "Mayfair Lagoon, Bhubaneswar",
    guestCount: 50,
    totalBudgetCents: 15000000, // ₹1,50,000
    currency: "INR",
    preferences: { theme: "Pastel Garden", dietary: "Vegetarian Focus" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBudgetItems = [
    {
      id: "b1",
      eventId: "11111111-1111-4111-a111-111111111111",
      category: "Catering & Sweets",
      description: "Live Chaat & Multi-Course Dinner Buffet",
      estimatedCostCents: 6500000, // ₹65,000
      actualCostCents: 0,
      status: "ESTIMATED" as const,
      origin: "AI_GENERATED" as const,
      isCustomByUser: false,
      isGuestSensitive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "b2",
      eventId: "11111111-1111-4111-a111-111111111111",
      category: "Themes & Decor",
      description: "Pastel Garden Balloon Arch & Floral Backdrop",
      estimatedCostCents: 2500000, // ₹25,000
      actualCostCents: 0,
      status: "QUOTED" as const,
      origin: "AI_GENERATED" as const,
      isCustomByUser: false,
      isGuestSensitive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockMilestones = [
    {
      id: "m1",
      eventId: "11111111-1111-4111-a111-111111111111",
      title: "Order Custom Eggless 2-Tier Birthday Cake",
      description: "Confirm flavor and smash cake with bakery",
      dueAt: "2026-11-06",
      offsetDaysFromEvent: -14,
      status: "NOT_STARTED" as const,
      priority: "HIGH" as const,
      origin: "AI_GENERATED" as const,
      isCustomByUser: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPlan: CompleteEventPlan = {
    event: mockEvent,
    budgetItems: mockBudgetItems,
    milestones: mockMilestones,
    vendorTasks: [
      {
        id: "v1",
        eventId: "11111111-1111-4111-a111-111111111111",
        category: "Bakery & Desserts",
        title: "Designer Birthday Cake",
        requirements: "2-tier pastel themed cake",
        status: "INQUIRY_SENT",
        estimatedCostCents: 1200000,
        origin: "AI_GENERATED",
        isCustomByUser: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ideas: [],
    budgetSummary: {
      totalBudgetCents: 15000000,
      totalEstimatedCostCents: 9000000,
      totalActualCostCents: 0,
      unallocatedBudgetCents: 6000000,
      remainingCashCents: 15000000,
      varianceCents: 9000000,
      isOverBudget: false,
      overrunCents: 0,
      perGuestEstimatedCents: 180000,
      perGuestActualCents: 0,
      allocationPercent: 60,
      categorySubtotals: [],
    },
    timelineSummary: {
      eventDate: "2026-11-20",
      daysUntilEvent: 27,
      isEventPast: false,
      totalMilestones: 5,
      completedMilestones: 1,
      overdueMilestones: 0,
      completionPercent: 20,
      milestones: [],
    },
    generationMode: "AI_GENERATED",
    assumptions: {
      budgetAssumptions: [],
      guestCountAssumptions: [],
      locationSpecificUncertainties: [],
      itemsRequiringUserConfirmation: [],
      permissionsToVerify: [],
    },
  };

  it("1. builds sanitized event grounding context without exposing secrets", () => {
    const { summaryString } = buildEventGroundingContext(mockPlan);
    expect(summaryString).toContain("Aarav's 1st Birthday Bash");
    expect(summaryString).toContain("50 Attendees");
    expect(summaryString).toContain("₹1,50,000");
    expect(summaryString).not.toContain("password");
    expect(summaryString).not.toContain("token");
  });

  it("2. scopes context for new activity budget inquiry without dumping milestones", () => {
    const { summaryString } = buildEventGroundingContext(mockPlan, "NEW_ACTIVITY_BUDGET");
    expect(summaryString).toContain("EVENT SUMMARY");
    expect(summaryString).toContain("Total Budget");
    // Should NOT dump milestone lists or vendor inquiries
    expect(summaryString).not.toContain("EVENT TIMELINE");
    expect(summaryString).not.toContain("Pending Milestones");
  });

  it("3. answers kids dance competition directly without hashtags or asterisks", () => {
    const res = generateDeterministicCopilotAdvice(mockPlan, {
      message: "how much should i increase the budget if am planning to host a small dance competitions for kids",
    });

    expect(res.success).toBe(true);
    // 1. Direct answer first
    expect(res.reply.startsWith("To host a small children's dance competition")).toBe(true);
    expect(res.reply).toContain("₹1,200 to ₹3,500");
    // 2. Discloses provisional estimate nature without claiming verified vendor quotes
    expect(res.reply).toContain("provisional planning estimates");
    expect(res.reply).toContain("not verified local vendor quotes");
    // 3. Itemizes transparent cost drivers
    expect(res.reply).toContain("Prizes & Medals");
    expect(res.reply).toContain("Music & Audio");
    expect(res.reply).toContain("Emcee / Host");
    // 4. Asks one concise follow-up question
    expect(res.reply).toContain("How many children do you expect to participate");
    // 5. Suggests structured action
    expect(res.suggestedActions.some((a) => a.type === "PROPOSE_BUDGET_ITEM")).toBe(true);
    // 6. Confirms zero markdown hashtags or asterisks
    expect(res.reply).not.toContain("###");
    expect(res.reply).not.toContain("**");
    expect(res.reply).not.toMatch(/[#*]/);
  });

  it("4. handles follow-up response with deterministic math and clean formatting", () => {
    const history: Array<{ role: "user" | "assistant"; content: string }> = [
      {
        role: "user",
        content: "how much should i increase the budget if am planning to host a small dance competitions for kids",
      },
      {
        role: "assistant",
        content: "How many children do you expect to participate (e.g., 5-10 or 15+)?",
      },
    ];

    const res = generateDeterministicCopilotAdvice(mockPlan, {
      message: "Around 10 kids",
      history,
    });

    expect(res.success).toBe(true);
    // Direct answer with 10 kids without asterisks
    expect(res.reply).toContain("Based on 10 participating children");
    // Arithmetic: 10 * 100 = 1000 + 300 = ₹1,300
    expect(res.reply).toContain("₹1,000");
    expect(res.reply).toContain("₹1,300");
    // Confirms zero markdown hashtags or asterisks
    expect(res.reply).not.toContain("###");
    expect(res.reply).not.toContain("**");
    // Suggests structured proposed budget item for ₹1,300 (130000 cents)
    const proposed = res.suggestedActions.find((a) => a.type === "PROPOSE_BUDGET_ITEM");
    expect(proposed).toBeDefined();
    expect(proposed?.payload?.amountCents).toBe(130000);
  });

  it("5. returns priority schedule when asked for next seven days", () => {
    const res = generateDeterministicCopilotAdvice(mockPlan, {
      message: "Help me plan the next seven days.",
    });

    expect(res.success).toBe(true);
    expect(res.reply).toContain("next 7 days");
    expect(res.reply).toContain("Order Custom Eggless 2-Tier Birthday Cake");
    expect(res.provider).toBe("deterministic_copilot");
    expect(res.suggestedActions.length).toBeGreaterThan(0);
    expect(res.followUpPrompts.length).toBe(3);
    expect(res.reply).not.toContain("###");
    expect(res.reply).not.toContain("**");
  });

  it("6. provides deterministic budget analysis without hashtags or asterisks", () => {
    const res = generateDeterministicCopilotAdvice(mockPlan, {
      message: "How can I stay within my budget and save money?",
    });

    expect(res.success).toBe(true);
    expect(res.reply).toContain("budget of ₹1,50,000");
    expect(res.suggestedActions.some((a) => a.type === "NAVIGATE_TAB")).toBe(true);
    expect(res.reply).not.toContain("###");
    expect(res.reply).not.toContain("**");
  });

  it("7. recommends booking sequence without hashtags or asterisks", () => {
    const res = generateDeterministicCopilotAdvice(mockPlan, {
      message: "What should I book first?",
    });

    expect(res.success).toBe(true);
    expect(res.reply).toContain("Venue and Banquet Hall");
    expect(res.reply).toContain("Caterer & Custom Cake");
    expect(res.suggestedActions.some((a) => a.type === "PROPOSE_TASK")).toBe(true);
    expect(res.reply).not.toContain("###");
    expect(res.reply).not.toContain("**");
  });

  it("8. calculates guest scaling impact deterministically without hashtags or asterisks", () => {
    const res = generateDeterministicCopilotAdvice(mockPlan, {
      message: "What if 10 more people attend?",
    });

    expect(res.success).toBe(true);
    expect(res.reply).toContain("10 more guests attend");
    expect(res.suggestedActions.some((a) => a.type === "PROPOSE_PLAN_ADJUSTMENT")).toBe(true);
    expect(res.reply).not.toContain("###");
    expect(res.reply).not.toContain("**");
  });

  it("9. validates chat request and response schemas strictly", () => {
    const validReq = CopilotChatRequestSchema.safeParse({
      message: "Create a checklist for coordinating my family.",
    });
    expect(validReq.success).toBe(true);

    const emptyReq = CopilotChatRequestSchema.safeParse({
      message: "",
    });
    expect(emptyReq.success).toBe(false);

    const res = generateDeterministicCopilotAdvice(mockPlan, {
      message: "Create a checklist for coordinating my family.",
    });
    const validRes = CopilotChatResponseSchema.safeParse(res);
    expect(validRes.success).toBe(true);
    expect(res.reply).not.toContain("###");
    expect(res.reply).not.toContain("**");
  });
});
