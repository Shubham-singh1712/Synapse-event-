import { assertNonNegativeCents, formatCentsToCurrency } from "./money";
import { calculateBudgetSummary } from "./budget";
import { addDaysToDate, getCalendarDaysDiff, isValidCalendarDate } from "./timeline";
import type { BudgetItemEntity, TimelineMilestoneEntity } from "./schemas";

export interface GuestCountImpactReport {
  previousGuestCount: number;
  newGuestCount: number;
  guestDelta: number; // new - previous
  percentageChange: number; // e.g. +50% or -20%
  perGuestEstimatedCostCents: number;
  previousTotalEstimatedCents: number;
  newProjectedEstimatedCents: number;
  totalBudgetCents: number;
  isOverBudget: boolean;
  projectedOverrunCents: number;
  unallocatedBudgetCents: number;
  guestSensitiveItemCount: number;
  warnings: string[];
  requiresUserReview: boolean;
  affectedItemIds: string[];
}

export interface BudgetChangeImpactReport {
  previousBudgetCents: number;
  newBudgetCents: number;
  budgetDeltaCents: number; // new - previous
  percentageChange: number;
  totalEstimatedCostCents: number;
  unallocatedBudgetCents: number;
  isOverBudget: boolean;
  overrunCents: number;
  warnings: string[];
  requiresUserReview: boolean;
  deficitCents: number;
}

export interface EventDateImpactReport {
  previousEventDate: string;
  newEventDate: string;
  shiftDays: number; // positive = moved later, negative = moved sooner
  asOfDate: string;
  daysUntilNewEvent: number;
  compressedLeadTime: boolean;
  warnings: string[];
  requiresUserReview: boolean;
  affectedMilestoneIds: string[];
  proposedMilestoneDateChanges: {
    milestoneId: string;
    title: string;
    currentDueDate: string;
    proposedDueDate: string;
    isCustomByUser: boolean;
    isCompleted: boolean;
  }[];
}

/**
 * Pure deterministic calculation of the impact of modifying an event's guest count.
 * Recalculates guest-sensitive line items proportionally based on explicit item attributes.
 * Non-guest-sensitive items (e.g. venue fixed fee, DJ, photography) remain unchanged.
 */
export function calculateGuestCountImpact(
  previousGuestCount: number,
  newGuestCount: number,
  totalBudgetCents: number,
  budgetItems: BudgetItemEntity[],
  currency: string = "INR"
): GuestCountImpactReport {
  if (previousGuestCount < 0 || !Number.isInteger(previousGuestCount)) {
    throw new Error(`Previous guest count must be a non-negative integer: ${previousGuestCount}`);
  }
  if (newGuestCount < 0 || !Number.isInteger(newGuestCount)) {
    throw new Error(`New guest count must be a non-negative integer: ${newGuestCount}`);
  }
  assertNonNegativeCents(totalBudgetCents, "Total budget");

  const guestDelta = newGuestCount - previousGuestCount;
  const percentageChange =
    previousGuestCount > 0
      ? Math.round(((newGuestCount - previousGuestCount) / previousGuestCount) * 1000) / 10
      : newGuestCount > 0
      ? 100
      : 0;

  const currentSummary = calculateBudgetSummary(totalBudgetCents, previousGuestCount, budgetItems);
  const affectedItemIds: string[] = [];
  const warnings: string[] = [];

  let projectedEstimatedCents = 0;
  let guestSensitiveItemCount = 0;

  for (const item of budgetItems) {
    if (item.status === "CANCELLED") continue;

    if (item.isGuestSensitive && previousGuestCount > 0) {
      guestSensitiveItemCount++;
      affectedItemIds.push(item.id);

      // Scale proportionally by guest count ratio
      const scaledCost = Math.round((item.estimatedCostCents * newGuestCount) / previousGuestCount);
      projectedEstimatedCents += scaledCost;
    } else {
      projectedEstimatedCents += item.estimatedCostCents;
    }
  }

  const isOverBudget = projectedEstimatedCents > totalBudgetCents;
  const projectedOverrunCents = isOverBudget ? projectedEstimatedCents - totalBudgetCents : 0;
  const unallocatedBudgetCents = totalBudgetCents - projectedEstimatedCents;

  if (guestDelta > 0) {
    if (isOverBudget) {
      warnings.push(
        `Increasing guest count by ${guestDelta} causes projected expenses (${formatCentsToCurrency(
          projectedEstimatedCents,
          currency
        )}) to exceed total budget by ${formatCentsToCurrency(projectedOverrunCents, currency)}.`
      );
    }
    if (guestSensitiveItemCount === 0 && budgetItems.length > 0) {
      warnings.push(
        "No budget line items are currently marked as guest-sensitive. Review catering and seating allocations."
      );
    }
  } else if (guestDelta < 0) {
    warnings.push(
      `Decreasing guest count by ${Math.abs(guestDelta)} creates ${formatCentsToCurrency(
        Math.max(0, unallocatedBudgetCents),
        currency
      )} in unallocated capacity.`
    );
  }

  const perGuestEstimatedCostCents =
    newGuestCount > 0 ? Math.round(projectedEstimatedCents / newGuestCount) : 0;

  return {
    previousGuestCount,
    newGuestCount,
    guestDelta,
    percentageChange,
    perGuestEstimatedCostCents,
    previousTotalEstimatedCents: currentSummary.totalEstimatedCostCents,
    newProjectedEstimatedCents: projectedEstimatedCents,
    totalBudgetCents,
    isOverBudget,
    projectedOverrunCents,
    unallocatedBudgetCents,
    guestSensitiveItemCount,
    warnings,
    requiresUserReview: isOverBudget || warnings.length > 0,
    affectedItemIds,
  };
}

/**
 * Pure deterministic calculation of the impact of modifying the total event budget.
 */
export function calculateBudgetChangeImpact(
  previousBudgetCents: number,
  newBudgetCents: number,
  budgetItems: BudgetItemEntity[],
  currency: string = "INR"
): BudgetChangeImpactReport {
  assertNonNegativeCents(previousBudgetCents, "Previous budget");
  assertNonNegativeCents(newBudgetCents, "New budget");

  const budgetDeltaCents = newBudgetCents - previousBudgetCents;
  const percentageChange =
    previousBudgetCents > 0
      ? Math.round((budgetDeltaCents / previousBudgetCents) * 1000) / 10
      : newBudgetCents > 0
      ? 100
      : 0;

  const currentSummary = calculateBudgetSummary(newBudgetCents, 1, budgetItems);
  const warnings: string[] = [];

  const isOverBudget = currentSummary.isOverBudget;
  const overrunCents = currentSummary.overrunCents;
  const deficitCents = isOverBudget ? overrunCents : 0;

  if (budgetDeltaCents < 0) {
    if (isOverBudget) {
      warnings.push(
        `Budget reduction of ${formatCentsToCurrency(
          Math.abs(budgetDeltaCents),
          currency
        )} creates a deficit of ${formatCentsToCurrency(deficitCents, currency)} against current allocations.`
      );
    } else {
      warnings.push(
        `Budget reduced by ${formatCentsToCurrency(
          Math.abs(budgetDeltaCents),
          currency
        )}. Remaining buffer is ${formatCentsToCurrency(currentSummary.unallocatedBudgetCents, currency)}.`
      );
    }
  } else if (budgetDeltaCents > 0) {
    warnings.push(
      `Budget increased by ${formatCentsToCurrency(
        budgetDeltaCents,
        currency
      )}. Available unallocated funds: ${formatCentsToCurrency(currentSummary.unallocatedBudgetCents, currency)}.`
    );
  }

  return {
    previousBudgetCents,
    newBudgetCents,
    budgetDeltaCents,
    percentageChange,
    totalEstimatedCostCents: currentSummary.totalEstimatedCostCents,
    unallocatedBudgetCents: currentSummary.unallocatedBudgetCents,
    isOverBudget,
    overrunCents,
    warnings,
    requiresUserReview: isOverBudget,
    deficitCents,
  };
}

/**
 * Pure deterministic calculation of the impact of shifting the event date.
 * Computes date shifts for milestones without mutating completed items or custom items.
 */
export function calculateEventDateImpact(
  previousEventDate: string,
  newEventDate: string,
  milestones: TimelineMilestoneEntity[],
  asOfDate: string
): EventDateImpactReport {
  if (!isValidCalendarDate(previousEventDate)) {
    throw new Error(`Invalid previous event date: "${previousEventDate}"`);
  }
  if (!isValidCalendarDate(newEventDate)) {
    throw new Error(`Invalid new event date: "${newEventDate}"`);
  }
  if (!isValidCalendarDate(asOfDate)) {
    throw new Error(`Invalid asOfDate: "${asOfDate}"`);
  }

  const shiftDays = getCalendarDaysDiff(previousEventDate, newEventDate);
  const daysUntilNewEvent = getCalendarDaysDiff(asOfDate, newEventDate);
  const compressedLeadTime = shiftDays < 0;

  const warnings: string[] = [];
  const affectedMilestoneIds: string[] = [];
  const proposedMilestoneDateChanges: EventDateImpactReport["proposedMilestoneDateChanges"] = [];

  if (daysUntilNewEvent < 0) {
    warnings.push(`Target event date (${newEventDate}) is in the past relative to today (${asOfDate}).`);
  } else if (compressedLeadTime) {
    warnings.push(
      `Event date moved sooner by ${Math.abs(
        shiftDays
      )} days. Lead times are compressed for vendor bookings.`
    );
  }

  for (const milestone of milestones) {
    const isCompleted = milestone.status === "COMPLETED";
    const isCustom = milestone.isCustomByUser;

    // Shift date by shiftDays
    const proposedDueDate = addDaysToDate(milestone.dueAt, shiftDays);
    const wouldBeOverdue = getCalendarDaysDiff(asOfDate, proposedDueDate) < 0 && !isCompleted;

    if (wouldBeOverdue) {
      warnings.push(
        `Milestone "${milestone.title}" would be overdue on new timeline (due: ${proposedDueDate}).`
      );
    }

    if (!isCompleted) {
      affectedMilestoneIds.push(milestone.id);
    }

    proposedMilestoneDateChanges.push({
      milestoneId: milestone.id,
      title: milestone.title,
      currentDueDate: milestone.dueAt,
      proposedDueDate,
      isCustomByUser: isCustom,
      isCompleted,
    });
  }

  return {
    previousEventDate,
    newEventDate,
    shiftDays,
    asOfDate,
    daysUntilNewEvent,
    compressedLeadTime,
    warnings,
    requiresUserReview: warnings.length > 0 || compressedLeadTime,
    affectedMilestoneIds,
    proposedMilestoneDateChanges,
  };
}
