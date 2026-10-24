/**
 * Domain Logic for SynapseEvent Unified "Plan & Checklist" Workspace
 * Combines dated chronological milestones and action checklist items into a coherent representation.
 */

import type { TimelineMilestoneEntity, VendorTaskEntity } from "./schemas";
import {
  isValidCalendarDate,
  getCalendarDaysDiff,
  toHumanTimelineStatus,
  fromHumanTimelineStatus,
  formatNaturalRelativeDueDate,
  type HumanTimelineStatus,
} from "./timeline";

export type TaskPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "NORMAL";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface UnifiedPlanTask {
  id: string;
  source: "milestone" | "custom_task";
  title: string;
  description: string;
  dueAt?: string; // YYYY-MM-DD if dated
  offsetDaysFromEvent?: number;
  status: TaskStatus;
  category: string;
  priority: TaskPriority;
  daysUntilDue?: number;
  isOverdue: boolean;
  isCustomByUser?: boolean;
}

export interface PlanChecklistSummary {
  totalTasks: number;
  outstandingTasks: number;
  dueSoonTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionPercent: number;
  nextUpTask: UnifiedPlanTask | null;
}

export type TimelineSectionKey =
  | "OVERDUE"
  | "TODAY"
  | "THIS_WEEK"
  | "LATER"
  | "NO_DATE"
  | "COMPLETED";

export interface TimelineGroup {
  key: TimelineSectionKey;
  title: string;
  subtitle: string;
  badgeClass: string;
  tasks: UnifiedPlanTask[];
}

/**
 * Standard Celebration Task Categories
 */
export const CELEBRATION_TASK_CATEGORIES = [
  "Venue & Setup",
  "Catering & Food",
  "Decor & Flowers",
  "Cake & Desserts",
  "Photography & Media",
  "Wardrobe & Styling",
  "Ceremony & Rituals",
  "Invitations & RSVP",
  "Entertainment & Music",
  "Travel & Logistics",
  "Family Coordination",
  "General",
] as const;

/**
 * Infers a sensible celebration category based on task title and keywords
 */
export function inferTaskCategory(title: string, explicitCategory?: string): string {
  if (explicitCategory && explicitCategory.trim() && explicitCategory !== "General") {
    return explicitCategory.trim();
  }

  const t = title.toLowerCase();
  if (t.includes("venue") || t.includes("hall") || t.includes("resort") || t.includes("hotel")) {
    return "Venue & Setup";
  }
  if (t.includes("cater") || t.includes("menu") || t.includes("food") || t.includes("halwai") || t.includes("snack")) {
    return "Catering & Food";
  }
  if (t.includes("cake") || t.includes("pastry") || t.includes("dessert") || t.includes("sweet")) {
    return "Cake & Desserts";
  }
  if (t.includes("decor") || t.includes("balloon") || t.includes("flower") || t.includes("mandap") || t.includes("lighting")) {
    return "Decor & Flowers";
  }
  if (t.includes("photo") || t.includes("video") || t.includes("album") || t.includes("camera")) {
    return "Photography & Media";
  }
  if (t.includes("outfit") || t.includes("dress") || t.includes("saree") || t.includes("sherwani") || t.includes("jewel") || t.includes("fitting")) {
    return "Wardrobe & Styling";
  }
  if (t.includes("pandit") || t.includes("puja") || t.includes("muhurat") || t.includes("ritual") || t.includes("feras") || t.includes("hawan")) {
    return "Ceremony & Rituals";
  }
  if (t.includes("invite") || t.includes("whatsapp") || t.includes("card") || t.includes("rsvp")) {
    return "Invitations & RSVP";
  }
  if (t.includes("music") || t.includes("dj") || t.includes("dhol") || t.includes("sangeet") || t.includes("playlist")) {
    return "Entertainment & Music";
  }
  if (t.includes("travel") || t.includes("cab") || t.includes("car") || t.includes("transport") || t.includes("pickup")) {
    return "Travel & Logistics";
  }
  if (t.includes("elder") || t.includes("family") || t.includes("relative") || t.includes("seating") || t.includes("wheelchair")) {
    return "Family Coordination";
  }

  return "General";
}

/**
 * Calculates a task priority based on proximity to due date
 */
export function calculateTaskPriority(daysUntilDue?: number, isOverdue?: boolean): TaskPriority {
  if (isOverdue) return "CRITICAL";
  if (daysUntilDue === undefined) return "NORMAL";
  if (daysUntilDue <= 3) return "HIGH";
  if (daysUntilDue <= 7) return "MEDIUM";
  return "NORMAL";
}

/**
 * Combines milestones and general tasks into a unified list of plan items.
 * Guarantees no duplication: each record keeps its unique origin and identity.
 */
export function mergeToUnifiedTasks(
  milestones: TimelineMilestoneEntity[],
  vendorTasks: VendorTaskEntity[] = [],
  asOfDate: string = new Date().toISOString().split("T")[0]!
): UnifiedPlanTask[] {
  const result: UnifiedPlanTask[] = [];

  // 1. Process dated milestones
  for (const m of milestones) {
    const isCompleted = m.status === "COMPLETED";
    const isCancelled = m.status === "CANCELLED";
    const hasValidDate = isValidCalendarDate(m.dueAt);
    const daysUntilDue = hasValidDate ? getCalendarDaysDiff(asOfDate, m.dueAt) : undefined;
    const isOverdue = !isCompleted && !isCancelled && daysUntilDue !== undefined && daysUntilDue < 0;

    result.push({
      id: m.id,
      source: "milestone",
      title: m.title,
      description: m.description || "",
      dueAt: hasValidDate ? m.dueAt : undefined,
      offsetDaysFromEvent: m.offsetDaysFromEvent ?? undefined,
      status: m.status,
      category: inferTaskCategory(m.title),
      priority: calculateTaskPriority(daysUntilDue, isOverdue),
      daysUntilDue,
      isOverdue,
      isCustomByUser: m.isCustomByUser,
    });
  }

  // 2. Process tasks from vendorTasks that are checklist tasks
  // (Filter out pure vendor quotations if they duplicate a milestone title)
  const milestoneTitles = new Set(milestones.map((m) => m.title.toLowerCase().trim()));

  for (const t of vendorTasks) {
    const normalizedTitle = t.title.toLowerCase().trim();
    // Prevent duplicate entries if a milestone with identical title exists
    if (milestoneTitles.has(normalizedTitle)) continue;

    const status: TaskStatus =
      t.status === "COMPLETED"
        ? "COMPLETED"
        : t.status === "CANCELLED"
        ? "CANCELLED"
        : t.status === "NOT_STARTED"
        ? "NOT_STARTED"
        : "IN_PROGRESS";

    result.push({
      id: t.id,
      source: "custom_task",
      title: t.title,
      description: t.requirements || "",
      dueAt: undefined, // Undated task
      status,
      category: t.category?.trim() || inferTaskCategory(t.title),
      priority: "NORMAL",
      daysUntilDue: undefined,
      isOverdue: false,
      isCustomByUser: t.isCustomByUser,
    });
  }

  return result;
}

/**
 * Calculates overall plan progress summary
 */
export function calculatePlanSummary(
  tasks: UnifiedPlanTask[],
  _eventDate?: string
): PlanChecklistSummary {
  const activeTasks = tasks.filter((t) => t.status !== "CANCELLED");
  const totalTasks = activeTasks.length;
  let completedTasks = 0;
  let overdueTasks = 0;
  let dueSoonTasks = 0;

  for (const t of activeTasks) {
    if (t.status === "COMPLETED") {
      completedTasks++;
    } else {
      if (t.isOverdue) overdueTasks++;
      if (t.daysUntilDue !== undefined && t.daysUntilDue >= 0 && t.daysUntilDue <= 7) {
        dueSoonTasks++;
      }
    }
  }

  const outstandingTasks = totalTasks - completedTasks;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Next up task: next urgent uncompleted task sorted by due date ascending
  const upcomingPending = activeTasks
    .filter((t) => t.status !== "COMPLETED" && t.dueAt)
    .sort((a, b) => (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999));

  const nextUpTask = upcomingPending[0] ?? null;

  return {
    totalTasks,
    outstandingTasks,
    dueSoonTasks,
    completedTasks,
    overdueTasks,
    completionPercent,
    nextUpTask,
  };
}

/**
 * Groups tasks into chronological sections for the Timeline view:
 * Overdue, Today, This Week (1-7 days), Later (8+ days), No Date, Completed
 */
export function groupTasksForTimeline(tasks: UnifiedPlanTask[]): TimelineGroup[] {
  const active = tasks.filter((t) => t.status !== "CANCELLED");

  const overdueList: UnifiedPlanTask[] = [];
  const todayList: UnifiedPlanTask[] = [];
  const thisWeekList: UnifiedPlanTask[] = [];
  const laterList: UnifiedPlanTask[] = [];
  const noDateList: UnifiedPlanTask[] = [];
  const completedList: UnifiedPlanTask[] = [];

  for (const t of active) {
    if (t.status === "COMPLETED") {
      completedList.push(t);
      continue;
    }

    if (!t.dueAt) {
      noDateList.push(t);
      continue;
    }

    const diff = t.daysUntilDue ?? 0;
    if (diff < 0) {
      overdueList.push(t);
    } else if (diff === 0) {
      todayList.push(t);
    } else if (diff <= 7) {
      thisWeekList.push(t);
    } else {
      laterList.push(t);
    }
  }

  // Sort groups by due date ascending
  const sortByDue = (a: UnifiedPlanTask, b: UnifiedPlanTask) =>
    (a.dueAt || "").localeCompare(b.dueAt || "");

  overdueList.sort(sortByDue);
  thisWeekList.sort(sortByDue);
  laterList.sort(sortByDue);

  const groups: TimelineGroup[] = [];

  if (overdueList.length > 0) {
    groups.push({
      key: "OVERDUE",
      title: "Needs Attention (Past Due)",
      subtitle: "Tasks that passed their target date",
      badgeClass: "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30",
      tasks: overdueList,
    });
  }

  if (todayList.length > 0) {
    groups.push({
      key: "TODAY",
      title: "Due Today",
      subtitle: "Steps scheduled for today",
      badgeClass: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
      tasks: todayList,
    });
  }

  if (thisWeekList.length > 0) {
    groups.push({
      key: "THIS_WEEK",
      title: "This Week",
      subtitle: "Coming up in the next 7 days",
      badgeClass: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30",
      tasks: thisWeekList,
    });
  }

  if (laterList.length > 0) {
    groups.push({
      key: "LATER",
      title: "Upcoming Steps",
      subtitle: "Scheduled for later dates",
      badgeClass: "bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30",
      tasks: laterList,
    });
  }

  if (noDateList.length > 0) {
    groups.push({
      key: "NO_DATE",
      title: "Checklist Steps (No Set Date)",
      subtitle: "General tasks to complete when convenient",
      badgeClass: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300",
      tasks: noDateList,
    });
  }

  if (completedList.length > 0) {
    groups.push({
      key: "COMPLETED",
      title: "Completed Steps",
      subtitle: "Finished tasks for your celebration",
      badgeClass: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
      tasks: completedList,
    });
  }

  return groups;
}

export {
  toHumanTimelineStatus,
  fromHumanTimelineStatus,
  formatNaturalRelativeDueDate,
  type HumanTimelineStatus,
};
