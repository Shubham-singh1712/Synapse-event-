import type { TimelineMilestoneEntity } from "./schemas";

export interface EnrichedMilestone extends TimelineMilestoneEntity {
  daysUntilDue: number; // negative = past due, 0 = today, positive = future
  isOverdue: boolean; // true only if daysUntilDue < 0 AND status !== "COMPLETED" AND status !== "CANCELLED"
  formattedDueDate: string;
}

export interface TimelineSummary {
  eventDate: string;
  daysUntilEvent: number;
  isEventPast: boolean;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  completionPercent: number;
  milestones: EnrichedMilestone[];
}

/**
 * Validates whether a string is a strictly valid YYYY-MM-DD calendar date.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number.parseInt(yearStr ?? "", 10);
  const month = Number.parseInt(monthStr ?? "", 10);
  const day = Number.parseInt(dayStr ?? "", 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

/**
 * Calculates calendar day offset from a base date string.
 * Example: addDaysToDate("2026-10-31", -30) -> "2026-10-01"
 */
export function addDaysToDate(baseDateStr: string, offsetDays: number): string {
  if (!isValidCalendarDate(baseDateStr)) {
    throw new Error(`Invalid base calendar date: "${baseDateStr}"`);
  }
  const [year, month, day] = baseDateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year!, month! - 1, day!));
  dateObj.setUTCDate(dateObj.getUTCDate() + offsetDays);

  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calculates the exact whole days difference between two YYYY-MM-DD dates (target - reference).
 * Positive = target is in the future.
 * Negative = target is in the past.
 */
export function getCalendarDaysDiff(referenceDateStr: string, targetDateStr: string): number {
  if (!isValidCalendarDate(referenceDateStr) || !isValidCalendarDate(targetDateStr)) {
    throw new Error(`Invalid date for comparison: ref="${referenceDateStr}", target="${targetDateStr}"`);
  }

  const [refY, refM, refD] = referenceDateStr.split("-").map(Number);
  const [tarY, tarM, tarD] = targetDateStr.split("-").map(Number);

  const refUtc = Date.UTC(refY!, refM! - 1, refD!);
  const tarUtc = Date.UTC(tarY!, tarM! - 1, tarD!);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((tarUtc - refUtc) / msPerDay);
}

/**
 * Sorts milestones chronologically by due date ascending.
 * Secondary sort by title alphabetically for stable deterministic ordering.
 */
export function sortMilestonesChronologically<T extends { dueAt: string; title: string }>(
  milestones: T[]
): T[] {
  return [...milestones].sort((a, b) => {
    const cmp = a.dueAt.localeCompare(b.dueAt);
    if (cmp !== 0) return cmp;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Pure deterministic calculation of timeline summary and milestone statuses.
 * @param eventDate YYYY-MM-DD
 * @param milestones array of milestone entities
 * @param asOfDate YYYY-MM-DD (defaults to UTC today if omitted)
 */
export function calculateTimelineSummary(
  eventDate: string,
  milestones: TimelineMilestoneEntity[],
  asOfDate?: string
): TimelineSummary {
  if (!isValidCalendarDate(eventDate)) {
    throw new Error(`Invalid event date: "${eventDate}"`);
  }

  const todayStr =
    asOfDate ??
    (() => {
      const now = new Date();
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
        now.getUTCDate()
      ).padStart(2, "0")}`;
    })();

  if (!isValidCalendarDate(todayStr)) {
    throw new Error(`Invalid asOfDate: "${todayStr}"`);
  }

  const daysUntilEvent = getCalendarDaysDiff(todayStr, eventDate);
  const isEventPast = daysUntilEvent < 0;

  let completedMilestones = 0;
  let overdueMilestones = 0;

  const enriched: EnrichedMilestone[] = milestones.map((m) => {
    if (!isValidCalendarDate(m.dueAt)) {
      throw new Error(`Invalid milestone dueAt date: "${m.dueAt}" on milestone "${m.title}"`);
    }

    const daysUntilDue = getCalendarDaysDiff(todayStr, m.dueAt);
    const isCompleted = m.status === "COMPLETED";
    const isCancelled = m.status === "CANCELLED";

    // Completed or cancelled milestones are NEVER overdue
    const isOverdue = !isCompleted && !isCancelled && daysUntilDue < 0;

    if (isCompleted) completedMilestones += 1;
    if (isOverdue) overdueMilestones += 1;

    return {
      ...m,
      daysUntilDue,
      isOverdue,
      formattedDueDate: m.dueAt,
    };
  });

  const sortedMilestones = sortMilestonesChronologically(enriched);
  const totalMilestones = milestones.length;
  const completionPercent =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return {
    eventDate,
    daysUntilEvent,
    isEventPast,
    totalMilestones,
    completedMilestones,
    overdueMilestones,
    completionPercent,
    milestones: sortedMilestones,
  };
}

// =============================================================================
// HUMAN-FRIENDLY CELEBRATION TIMELINE DOMAIN LOGIC
// =============================================================================

export type HumanTimelineStatus = "To do" | "In progress" | "Done";

export function toHumanTimelineStatus(status: TimelineMilestoneEntity["status"]): HumanTimelineStatus {
  switch (status) {
    case "COMPLETED":
      return "Done";
    case "IN_PROGRESS":
      return "In progress";
    case "NOT_STARTED":
    default:
      return "To do";
  }
}

export function fromHumanTimelineStatus(human: HumanTimelineStatus): TimelineMilestoneEntity["status"] {
  switch (human) {
    case "Done":
      return "COMPLETED";
    case "In progress":
      return "IN_PROGRESS";
    case "To do":
    default:
      return "NOT_STARTED";
  }
}

/**
 * Returns human-friendly relative due date string:
 * e.g. "Due today", "Due tomorrow", "Due in 7 days", "Overdue by 2 days"
 */
export function formatNaturalRelativeDueDate(
  dueAt: string,
  asOfDate: string = new Date().toISOString().split("T")[0]!
): string {
  if (!isValidCalendarDate(dueAt) || !isValidCalendarDate(asOfDate)) {
    return "";
  }
  const diffDays = getCalendarDaysDiff(asOfDate, dueAt);

  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays === -1) return "Overdue by 1 day";
  if (diffDays < -1) return `Overdue by ${Math.abs(diffDays)} days`;
  return `Due in ${diffDays} days`;
}

/**
 * Returns natural phrase relative to celebration event:
 * e.g. "30 days before the event", "Day of the event", "2 days after celebration"
 */
export function formatNaturalEventOffset(offsetDays: number): string {
  if (offsetDays === 0) return "Day of the event";
  if (offsetDays < 0) return `${Math.abs(offsetDays)} days before the event`;
  return `${offsetDays} days after celebration`;
}

export interface CelebrationTaskSuggestion {
  title: string;
  description: string;
  recommendedOffsetDays: number;
  categoryBadge: string;
}

export const BIRTHDAY_SUGGESTIONS: CelebrationTaskSuggestion[] = [
  {
    title: "Order the birthday cake",
    description: "Finalize favorite flavor, custom message, size, and delivery timing.",
    recommendedOffsetDays: -7,
    categoryBadge: "Cake & Food",
  },
  {
    title: "Confirm the catering menu",
    description: "Finalize snacks, main course, desserts, and special options for children and elders.",
    recommendedOffsetDays: -14,
    categoryBadge: "Food",
  },
  {
    title: "Send invitations on WhatsApp",
    description: "Share the digital invite with time, venue Google Maps link, and RSVP request.",
    recommendedOffsetDays: -15,
    categoryBadge: "Invites",
  },
  {
    title: "Arrange balloons & floral decor",
    description: "Book decor artist or order balloons, banner, fairy lights, and welcome board.",
    recommendedOffsetDays: -10,
    categoryBadge: "Decor",
  },
  {
    title: "Buy the celebration outfit",
    description: "Try on and finalize birthday dress, shoes, and any matching family outfits.",
    recommendedOffsetDays: -12,
    categoryBadge: "Outfits",
  },
  {
    title: "Prepare return gifts & goodie bags",
    description: "Pack thoughtful return gifts, sweets, or games for kids and visiting guests.",
    recommendedOffsetDays: -5,
    categoryBadge: "Gifts",
  },
  {
    title: "Arrange comfortable seating for family elders",
    description: "Ensure quiet, cushioned seating near the celebration area for grandparents and seniors.",
    recommendedOffsetDays: -3,
    categoryBadge: "Comfort",
  },
  {
    title: "Confirm the photographer",
    description: "Confirm timing for cake cutting, family portraits, and candid moments.",
    recommendedOffsetDays: -8,
    categoryBadge: "Memories",
  },
  {
    title: "Coordinate pickup & transport for visiting family",
    description: "Organize cars or cabs for relatives arriving from airport or railway station.",
    recommendedOffsetDays: -2,
    categoryBadge: "Transport",
  },
  {
    title: "Settle final advance payments with vendors",
    description: "Review outstanding balances for caterer, decorator, and sound setup.",
    recommendedOffsetDays: -1,
    categoryBadge: "Payments",
  },
];

export const WEDDING_SUGGESTIONS: CelebrationTaskSuggestion[] = [
  {
    title: "Confirm the venue and catering menu",
    description: "Lock down ceremony & reception halls, food tasting session, and live counters.",
    recommendedOffsetDays: -45,
    categoryBadge: "Venue & Food",
  },
  {
    title: "Coordinate outfits and family jewellery",
    description: "Schedule final bridal fittings, matching safas/dupattas, and secure locker arrangements.",
    recommendedOffsetDays: -30,
    categoryBadge: "Outfits",
  },
  {
    title: "Send wedding invitations and track WhatsApp RSVPs",
    description: "Distribute boxed cards / digital invites and record guest room requirements.",
    recommendedOffsetDays: -35,
    categoryBadge: "Invites",
  },
  {
    title: "Arrange guest accommodation and station cabs",
    description: "Block hotel rooms and organize dedicated arrival cabs for outstation family members.",
    recommendedOffsetDays: -20,
    categoryBadge: "Hospitality",
  },
  {
    title: "Plan Mehendi, Haldi & Sangeet celebrations",
    description: "Coordinate music playlist, dhol player, henna artists, and colorful ceremony themes.",
    recommendedOffsetDays: -25,
    categoryBadge: "Ceremonies",
  },
  {
    title: "Confirm Pandit ji and ceremony muhurat timing",
    description: "Verify samagri list, havan setup, stage mandap decor, and auspicious hours.",
    recommendedOffsetDays: -15,
    categoryBadge: "Rituals",
  },
  {
    title: "Coordinate photography, bridal makeup & family timelines",
    description: "Align makeup artist arrival, groom procession (baraat) time, and couple portraits.",
    recommendedOffsetDays: -10,
    categoryBadge: "Coordination",
  },
  {
    title: "Settle final vendor balances and cash envelopes (shagun)",
    description: "Prepare shagun lifafas, vendor balance cheques, and tips for event staff.",
    recommendedOffsetDays: -2,
    categoryBadge: "Payments",
  },
];

export const GENERAL_SUGGESTIONS: CelebrationTaskSuggestion[] = [
  {
    title: "Finalize the celebration guest list",
    description: "Gather contact numbers and confirm estimated headcount for seating and food.",
    recommendedOffsetDays: -25,
    categoryBadge: "Guests",
  },
  {
    title: "Confirm the venue or prepare celebration space",
    description: "Inspect hall facilities, parking, restrooms, and backup power.",
    recommendedOffsetDays: -20,
    categoryBadge: "Venue",
  },
  {
    title: "Book the caterer and review menu selections",
    description: "Confirm welcome drinks, appetizers, main feast, and regional sweets.",
    recommendedOffsetDays: -15,
    categoryBadge: "Food",
  },
  {
    title: "Send digital invitations via WhatsApp",
    description: "Send personalized messages with date, timing, and venue location pin.",
    recommendedOffsetDays: -12,
    categoryBadge: "Invites",
  },
  {
    title: "Confirm sound system & music arrangements",
    description: "Check wireless microphones, speakers, playlist, or live musicians.",
    recommendedOffsetDays: -7,
    categoryBadge: "Music",
  },
  {
    title: "Order bouquets & welcome mementos",
    description: "Prepare flowers, shawls, or gifts for honored guests and speakers.",
    recommendedOffsetDays: -5,
    categoryBadge: "Gifts",
  },
  {
    title: "Confirm photographer & videographer",
    description: "Confirm arrival time, key moments to capture, and stage lighting.",
    recommendedOffsetDays: -6,
    categoryBadge: "Media",
  },
];

