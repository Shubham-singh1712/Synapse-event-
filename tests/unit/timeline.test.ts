import { describe, it, expect } from "vitest";
import {
  addDaysToDate,
  getCalendarDaysDiff,
  sortMilestonesChronologically,
  calculateTimelineSummary,
  isValidCalendarDate,
  toHumanTimelineStatus,
  fromHumanTimelineStatus,
  formatNaturalRelativeDueDate,
  formatNaturalEventOffset,
  BIRTHDAY_SUGGESTIONS,
  WEDDING_SUGGESTIONS,
} from "@/lib/domain/timeline";
import { sampleMilestones } from "../fixtures/event-fixtures";
import type { TimelineMilestoneEntity } from "@/lib/domain/schemas";

describe("Domain Timeline & Milestone Calculations", () => {
  // 13. Generate milestone dates relative to an event date
  it("13. generates milestone dates relative to an event date deterministically", () => {
    const eventDate = "2026-11-20";

    // 90 days before event
    const bookingMilestone = addDaysToDate(eventDate, -90);
    expect(bookingMilestone).toBe("2026-08-22");

    // 30 days before event
    const menuMilestone = addDaysToDate(eventDate, -30);
    expect(menuMilestone).toBe("2026-10-21");

    // Day of event (offset 0)
    expect(addDaysToDate(eventDate, 0)).toBe("2026-11-20");

    // 1 day after event
    expect(addDaysToDate(eventDate, 1)).toBe("2026-11-21");
  });

  // 14. Sort milestones chronologically
  it("14. sorts milestones chronologically by due date ascending", () => {
    const unsorted = [
      { dueAt: "2026-11-05", title: "C. Wedding Favors" },
      { dueAt: "2026-06-01", title: "A. Secure Venue" },
      { dueAt: "2026-10-01", title: "B. Menu Tasting" },
    ];

    const sorted = sortMilestonesChronologically(unsorted);
    expect(sorted[0]?.title).toBe("A. Secure Venue");
    expect(sorted[1]?.title).toBe("B. Menu Tasting");
    expect(sorted[2]?.title).toBe("C. Wedding Favors");
  });

  // 15. Detect overdue incomplete milestones
  it("15. detects overdue incomplete milestones relative to asOfDate", () => {
    const asOfDate = "2026-10-15";
    const summary = calculateTimelineSummary("2026-11-20", sampleMilestones, asOfDate);

    // m2222222 (Menu Tasting) is due 2026-10-01, status is IN_PROGRESS, so it is overdue
    const menuMilestone = summary.milestones.find((m) => m.id === "m2222222-2222-4222-a222-222222222222");
    expect(menuMilestone?.isOverdue).toBe(true);
    expect(menuMilestone?.daysUntilDue).toBe(-14);

    // m3333333 (Favors) is due 2026-11-05, not overdue
    const favorMilestone = summary.milestones.find((m) => m.id === "m3333333-3333-4333-a333-333333333333");
    expect(favorMilestone?.isOverdue).toBe(false);
    expect(favorMilestone?.daysUntilDue).toBe(21);
  });

  // 16. Do not mark completed milestones overdue
  it("16. does NOT mark completed milestones overdue even if due date is in the past", () => {
    const asOfDate = "2026-10-15";
    const summary = calculateTimelineSummary("2026-11-20", sampleMilestones, asOfDate);

    // m1111111 (Secure Venue) was due 2026-06-01, but is COMPLETED
    const venueMilestone = summary.milestones.find((m) => m.id === "m1111111-1111-4111-a111-111111111111");
    expect(venueMilestone?.status).toBe("COMPLETED");
    expect(venueMilestone?.isOverdue).toBe(false);
  });

  // 17. Handle timezone boundaries and daylight-saving transitions where relevant
  it("17. handles calendar day boundaries and leap-years without UTC drift", () => {
    // Leap year boundary check: 2028-02-28 + 1 day = 2028-02-29
    expect(addDaysToDate("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToDate("2028-02-28", 2)).toBe("2028-03-01");

    // Standard year: 2026-02-28 + 1 day = 2026-03-01
    expect(addDaysToDate("2026-02-28", 1)).toBe("2026-03-01");

    // Day difference across DST boundary (March / November in US)
    // 2026-10-31 to 2026-11-02 crosses US DST shift (Nov 1, 2026)
    expect(getCalendarDaysDiff("2026-10-31", "2026-11-02")).toBe(2);
  });

  // 18. Reject invalid dates
  it("18. rejects malformed or impossible calendar dates", () => {
    expect(isValidCalendarDate("2026-02-30")).toBe(false); // Feb 30 does not exist
    expect(isValidCalendarDate("2026-13-01")).toBe(false); // Month 13 invalid
    expect(isValidCalendarDate("invalid-date")).toBe(false);
    expect(isValidCalendarDate("2026/10/20")).toBe(false);

    expect(() => addDaysToDate("2026-02-30", 5)).toThrowError();
    expect(() => getCalendarDaysDiff("invalid", "2026-10-20")).toThrowError();

    const invalidMilestones: TimelineMilestoneEntity[] = [
      {
        ...sampleMilestones[0]!,
        dueAt: "not-a-date",
      },
    ];
    expect(() => calculateTimelineSummary("2026-11-20", invalidMilestones)).toThrowError();
  });

  // 19. Human-friendly status translation tests
  it("19. correctly maps between internal enum statuses and human-friendly labels", () => {
    expect(toHumanTimelineStatus("NOT_STARTED")).toBe("To do");
    expect(toHumanTimelineStatus("IN_PROGRESS")).toBe("In progress");
    expect(toHumanTimelineStatus("COMPLETED")).toBe("Done");

    expect(fromHumanTimelineStatus("To do")).toBe("NOT_STARTED");
    expect(fromHumanTimelineStatus("In progress")).toBe("IN_PROGRESS");
    expect(fromHumanTimelineStatus("Done")).toBe("COMPLETED");
  });

  // 20. Natural relative date formatting tests
  it("20. formats natural relative dates cleanly without technical jargon", () => {
    const today = "2026-10-23";

    expect(formatNaturalRelativeDueDate("2026-10-23", today)).toBe("Due today");
    expect(formatNaturalRelativeDueDate("2026-10-24", today)).toBe("Due tomorrow");
    expect(formatNaturalRelativeDueDate("2026-10-30", today)).toBe("Due in 7 days");
    expect(formatNaturalRelativeDueDate("2026-10-22", today)).toBe("Overdue by 1 day");
    expect(formatNaturalRelativeDueDate("2026-10-21", today)).toBe("Overdue by 2 days");

    // Event offset formatting
    expect(formatNaturalEventOffset(-30)).toBe("30 days before the event");
    expect(formatNaturalEventOffset(0)).toBe("Day of the event");
    expect(formatNaturalEventOffset(2)).toBe("2 days after celebration");
  });

  // 21. Archetype celebration suggestions contain Indian family-friendly tasks
  it("21. verifies Indian celebration suggestions contain relevant non-technical tasks", () => {
    expect(BIRTHDAY_SUGGESTIONS.some((s) => s.title.includes("cake"))).toBe(true);
    expect(BIRTHDAY_SUGGESTIONS.some((s) => s.title.includes("WhatsApp"))).toBe(true);
    expect(BIRTHDAY_SUGGESTIONS.some((s) => s.title.includes("elders"))).toBe(true);
    expect(BIRTHDAY_SUGGESTIONS.some((s) => s.title.includes("outfit"))).toBe(true);

    expect(WEDDING_SUGGESTIONS.some((s) => s.title.includes("Mehendi") || s.title.includes("Haldi") || s.title.includes("Sangeet"))).toBe(true);
    expect(WEDDING_SUGGESTIONS.some((s) => s.title.includes("cabs") || s.title.includes("rooms"))).toBe(true);
    expect(WEDDING_SUGGESTIONS.some((s) => s.title.includes("Pandit") || s.title.includes("muhurat"))).toBe(true);
  });
});
