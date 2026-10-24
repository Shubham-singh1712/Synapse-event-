import { describe, it, expect } from "vitest";
import {
  inferTaskCategory,
  calculateTaskPriority,
  mergeToUnifiedTasks,
  calculatePlanSummary,
  groupTasksForTimeline,
  type UnifiedPlanTask,
} from "@/lib/domain/plan";
import type { TimelineMilestoneEntity, VendorTaskEntity } from "@/lib/domain/schemas";

function createMockMilestone(overrides: Partial<TimelineMilestoneEntity> = {}): TimelineMilestoneEntity {
  return {
    id: "m-1234",
    eventId: "e-1234",
    title: "Order the birthday cake",
    description: "Custom eggless chocolate cake",
    dueAt: "2026-10-25",
    offsetDaysFromEvent: -5,
    status: "NOT_STARTED",
    origin: "USER_CUSTOM",
    isCustomByUser: true,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

function createMockTask(overrides: Partial<VendorTaskEntity> = {}): VendorTaskEntity {
  return {
    id: "t-1234",
    eventId: "e-1234",
    category: "Family Coordination",
    title: "Arrange seating for elders",
    requirements: "Cushioned front-row chairs",
    status: "NOT_STARTED",
    origin: "USER_CUSTOM",
    isCustomByUser: true,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

describe("Unified Plan & Checklist Domain Logic", () => {
  describe("Category Inference", () => {
    it("preserves explicit category if provided", () => {
      expect(inferTaskCategory("Something", "Custom Category")).toBe("Custom Category");
    });

    it("infers Indian celebration categories accurately based on keywords", () => {
      expect(inferTaskCategory("Book the banquet hall and lawn setup")).toBe("Venue & Setup");
      expect(inferTaskCategory("Confirm catering menu and live chaat counter")).toBe("Catering & Food");
      expect(inferTaskCategory("Order 2-tier chocolate truffle cake")).toBe("Cake & Desserts");
      expect(inferTaskCategory("Arrange balloon arch and fairy lighting")).toBe("Decor & Flowers");
      expect(inferTaskCategory("Hire candid wedding photographer")).toBe("Photography & Media");
      expect(inferTaskCategory("Bridal fitting and sherwani alterations")).toBe("Wardrobe & Styling");
      expect(inferTaskCategory("Confirm Pandit ji for phera muhurat")).toBe("Ceremony & Rituals");
      expect(inferTaskCategory("Send digital WhatsApp invites")).toBe("Invitations & RSVP");
      expect(inferTaskCategory("Book live dhol player for Baraat")).toBe("Entertainment & Music");
      expect(inferTaskCategory("Reserve elderly seating and wheelchair ramp")).toBe("Family Coordination");
    });
  });

  describe("Task Priority Calculation", () => {
    it("assigns CRITICAL to overdue items", () => {
      expect(calculateTaskPriority(-2, true)).toBe("CRITICAL");
    });

    it("assigns HIGH to items due within 3 days", () => {
      expect(calculateTaskPriority(1, false)).toBe("HIGH");
      expect(calculateTaskPriority(3, false)).toBe("HIGH");
    });

    it("assigns MEDIUM to items due in 4-7 days", () => {
      expect(calculateTaskPriority(5, false)).toBe("MEDIUM");
      expect(calculateTaskPriority(7, false)).toBe("MEDIUM");
    });

    it("assigns NORMAL to items due in 8+ days or undated", () => {
      expect(calculateTaskPriority(10, false)).toBe("NORMAL");
      expect(calculateTaskPriority(undefined, false)).toBe("NORMAL");
    });
  });

  describe("Merge to Unified Tasks", () => {
    it("merges milestones and checklist tasks into unified format", () => {
      const milestones = [
        createMockMilestone({ id: "m1", title: "Order cake", dueAt: "2026-10-25" }),
      ];
      const tasks = [
        createMockTask({ id: "t1", title: "Arrange seating for grandparents" }),
      ];

      const unified = mergeToUnifiedTasks(milestones, tasks, "2026-10-24");

      expect(unified.length).toBe(2);
      expect(unified[0]!.id).toBe("m1");
      expect(unified[0]!.source).toBe("milestone");
      expect(unified[0]!.dueAt).toBe("2026-10-25");
      expect(unified[0]!.daysUntilDue).toBe(1);

      expect(unified[1]!.id).toBe("t1");
      expect(unified[1]!.source).toBe("custom_task");
      expect(unified[1]!.dueAt).toBeUndefined();
    });

    it("prevents duplicate tasks if a milestone and checklist item share the exact same title", () => {
      const milestones = [createMockMilestone({ id: "m1", title: "Book Pandit ji" })];
      const tasks = [createMockTask({ id: "t1", title: "Book Pandit ji" })];

      const unified = mergeToUnifiedTasks(milestones, tasks, "2026-10-24");
      expect(unified.length).toBe(1);
      expect(unified[0]!.id).toBe("m1");
    });
  });

  describe("Plan Summary Calculation", () => {
    it("computes accurate summary counts without double counting", () => {
      const tasks: UnifiedPlanTask[] = [
        {
          id: "1",
          source: "milestone",
          title: "Overdue step",
          description: "",
          dueAt: "2026-10-20",
          status: "NOT_STARTED",
          category: "General",
          priority: "CRITICAL",
          daysUntilDue: -4,
          isOverdue: true,
        },
        {
          id: "2",
          source: "milestone",
          title: "Due tomorrow",
          description: "",
          dueAt: "2026-10-25",
          status: "IN_PROGRESS",
          category: "General",
          priority: "HIGH",
          daysUntilDue: 1,
          isOverdue: false,
        },
        {
          id: "3",
          source: "custom_task",
          title: "Done step",
          description: "",
          status: "COMPLETED",
          category: "General",
          priority: "NORMAL",
          isOverdue: false,
        },
        {
          id: "4",
          source: "custom_task",
          title: "Cancelled step",
          description: "",
          status: "CANCELLED",
          category: "General",
          priority: "NORMAL",
          isOverdue: false,
        },
      ];

      const summary = calculatePlanSummary(tasks);

      // Total active tasks: 3 (excluding cancelled)
      expect(summary.totalTasks).toBe(3);
      expect(summary.completedTasks).toBe(1);
      expect(summary.outstandingTasks).toBe(2);
      expect(summary.overdueTasks).toBe(1);
      expect(summary.dueSoonTasks).toBe(1);
      expect(summary.completionPercent).toBe(33); // 1 / 3 = 33%
      expect(summary.nextUpTask?.id).toBe("1"); // Most urgent pending task
    });
  });

  describe("Timeline Grouping", () => {
    it("groups dated and undated tasks into chronological sections", () => {
      const tasks: UnifiedPlanTask[] = [
        {
          id: "1",
          source: "milestone",
          title: "Past due",
          description: "",
          dueAt: "2026-10-20",
          status: "NOT_STARTED",
          category: "General",
          priority: "CRITICAL",
          daysUntilDue: -4,
          isOverdue: true,
        },
        {
          id: "2",
          source: "milestone",
          title: "Today task",
          description: "",
          dueAt: "2026-10-24",
          status: "NOT_STARTED",
          category: "General",
          priority: "HIGH",
          daysUntilDue: 0,
          isOverdue: false,
        },
        {
          id: "3",
          source: "milestone",
          title: "This week task",
          description: "",
          dueAt: "2026-10-28",
          status: "NOT_STARTED",
          category: "General",
          priority: "MEDIUM",
          daysUntilDue: 4,
          isOverdue: false,
        },
        {
          id: "4",
          source: "milestone",
          title: "Next month task",
          description: "",
          dueAt: "2026-11-20",
          status: "NOT_STARTED",
          category: "General",
          priority: "NORMAL",
          daysUntilDue: 27,
          isOverdue: false,
        },
        {
          id: "5",
          source: "custom_task",
          title: "Undated task",
          description: "",
          status: "NOT_STARTED",
          category: "General",
          priority: "NORMAL",
          isOverdue: false,
        },
        {
          id: "6",
          source: "milestone",
          title: "Done task",
          description: "",
          dueAt: "2026-10-22",
          status: "COMPLETED",
          category: "General",
          priority: "NORMAL",
          isOverdue: false,
        },
      ];

      const groups = groupTasksForTimeline(tasks);

      expect(groups.some((g) => g.key === "OVERDUE")).toBe(true);
      expect(groups.some((g) => g.key === "TODAY")).toBe(true);
      expect(groups.some((g) => g.key === "THIS_WEEK")).toBe(true);
      expect(groups.some((g) => g.key === "LATER")).toBe(true);
      expect(groups.some((g) => g.key === "NO_DATE")).toBe(true);
      expect(groups.some((g) => g.key === "COMPLETED")).toBe(true);
    });
  });
});
