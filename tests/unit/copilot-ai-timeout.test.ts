import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeCopilotChat } from "@/lib/ai/copilot";
import type { CompleteEventPlan } from "@/lib/services/event-service";

const mockGenerateContent = vi.fn();

// Mock @google/genai as a class constructor
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe("Batch C — Copilot AI Timeout & Fallback Engine", () => {
  const mockPlan: CompleteEventPlan = {
    event: {
      id: "11111111-2222-3333-4444-555555555555",
      workspaceId: "ws-test",
      title: "Rohan & Priya's Sangeet",
      archetype: "WEDDING",
      eventDate: "2026-11-20",
      timezone: "Asia/Kolkata",
      location: "Taj Bengal, Kolkata",
      guestCount: 150,
      totalBudgetCents: 50000000, // ₹5,00,000
      currency: "INR",
      preferences: { theme: "Royal Marigold" },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    budgetItems: [
      {
        id: "b-1",
        eventId: "11111111-2222-3333-4444-555555555555",
        category: "Catering",
        description: "Royal Multi-Course Dinner",
        estimatedCostCents: 20000000,
        actualCostCents: 0,
        status: "COMMITTED",
        origin: "AI_GENERATED",
        isCustomByUser: false,
        isGuestSensitive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    milestones: [
      {
        id: "m-1",
        eventId: "11111111-2222-3333-4444-555555555555",
        title: "Book Banquet Hall",
        description: "Reserve the primary ballroom",
        dueAt: "2026-10-15",
        offsetDaysFromEvent: -35,
        status: "NOT_STARTED",
        priority: "CRITICAL",
        origin: "AI_GENERATED",
        isCustomByUser: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    vendorTasks: [],
    ideas: [],
    budgetSummary: {
      totalBudgetCents: 50000000,
      totalEstimatedCostCents: 20000000,
      totalActualCostCents: 0,
      unallocatedBudgetCents: 30000000,
      remainingCashCents: 50000000,
      varianceCents: 30000000,
      isOverBudget: false,
      overrunCents: 0,
      perGuestEstimatedCents: 133333,
      perGuestActualCents: 0,
      allocationPercent: 40,
      categorySubtotals: [],
    },
    timelineSummary: {
      eventDate: "2026-11-20",
      daysUntilEvent: 22,
      isEventPast: false,
      totalMilestones: 1,
      completedMilestones: 0,
      overdueMilestones: 0,
      completionPercent: 0,
      milestones: [],
    },
    generationMode: "AI_GENERATED",
    assumptions: {
      budgetAssumptions: [],
      guestCountAssumptions: [],
      locationSpecificUncertainties: [],
      itemsRequiringUserConfirmation: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. gracefully uses deterministic copilot when GEMINI_API_KEY is not set", async () => {
    const res = await executeCopilotChat(
      mockPlan,
      { message: "How can I reduce catering expenses?" },
      "" // empty apiKeyOverride
    );

    expect(res.success).toBe(true);
    expect(res.provider).toBe("deterministic_copilot");
    expect(res.reply.length).toBeGreaterThan(0);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("2. clears timer and returns Gemini response on successful generation", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const mockAiPayload = {
      reply: "You can save up to 15% on catering by streamlining live food counters.",
      suggestedActions: [
        {
          id: "act-1",
          type: "PROPOSE_BUDGET_ITEM",
          title: "Streamline Food Counters",
          description: "Adjust menu with banquet chef",
          payload: { category: "Catering", amountCents: 17000000 },
        },
      ],
      followUpPrompts: ["Would you like to review dessert options?"],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockAiPayload),
    });

    const res = await executeCopilotChat(
      mockPlan,
      { message: "How can I reduce catering expenses?" },
      "test-fake-key"
    );

    expect(res.success).toBe(true);
    expect(res.provider).toBe("gemini");
    expect(res.reply).toContain("streamlining live food counters");
    expect(res.suggestedActions.length).toBe(1);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("3. clears timer and falls back to deterministic copilot on provider rejection", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    mockGenerateContent.mockRejectedValueOnce(new Error("API_QUOTA_EXCEEDED"));

    const res = await executeCopilotChat(
      mockPlan,
      { message: "How can I reduce catering expenses?" },
      "test-fake-key"
    );

    expect(res.success).toBe(true);
    expect(res.provider).toBe("deterministic_copilot");
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("4. handles AI timeout with deterministic fallback and suppresses late rejection", async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    // Provider hangs, and then later rejects after timeout
    let lateReject: (reason?: unknown) => void = () => {};
    const hangingPromise = new Promise((_, reject) => {
      lateReject = reject;
    });
    mockGenerateContent.mockReturnValueOnce(hangingPromise);

    const chatPromise = executeCopilotChat(
      mockPlan,
      { message: "What should I book first?" },
      "test-fake-key"
    );

    // Fast forward past AI_REQUEST_TIMEOUT_MS (20s)
    await vi.advanceTimersByTimeAsync(21000);

    const res = await chatPromise;

    expect(res.success).toBe(true);
    expect(res.provider).toBe("deterministic_copilot");
    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Trigger late rejection on the underlying hanging call - should not throw unhandled rejection
    expect(() => {
      lateReject(new Error("Late Gemini failure"));
    }).not.toThrow();

    vi.useRealTimers();
  });
});
