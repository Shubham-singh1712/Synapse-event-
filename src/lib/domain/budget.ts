import { assertNonNegativeCents, formatCentsToCurrency } from "./money";
import type { BudgetItemEntity } from "./schemas";

export const CELEBRATION_CATEGORIES = [
  "Venue & Mandap",
  "Catering & Halwai",
  "Decor & Floral",
  "Photography & Video",
  "Attire & Trousseau",
  "Jewellery & Accessories",
  "Entertainment & Music",
  "Invitations & Gifts",
  "Guest Transport & Logistics",
  "Priest & Rituals",
  "Production & Lighting",
  "Hair & Makeup",
  "Miscellaneous & Contingency",
] as const;

export interface CategorySubtotal {
  category: string;
  itemCount: number;
  totalEstimatedCostCents: number;
  totalActualCostCents: number;
  varianceCents: number; // positive = under budget, negative = over budget
  formattedEstimated: string;
  formattedActual: string;
}

export interface BudgetFinancialSummary {
  totalBudgetCents: number;
  totalEstimatedCostCents: number;
  totalActualCostCents: number;
  unallocatedBudgetCents: number; // totalBudgetCents - totalEstimatedCostCents (can be negative if over budget)
  remainingCashCents: number; // totalBudgetCents - totalActualCostCents
  varianceCents: number; // totalEstimatedCostCents - totalActualCostCents
  isOverBudget: boolean;
  overrunCents: number; // 0 if not over budget, otherwise totalEstimated - totalBudget
  perGuestEstimatedCents: number; // 0 if guestCount === 0
  perGuestActualCents: number; // 0 if guestCount === 0
  allocationPercent: number; // 0 to 100+
  categorySubtotals: CategorySubtotal[];
}

/**
 * Pure deterministic calculation of the complete budget financial metrics.
 * Operates purely on integer cents without floating point drift.
 */
export function calculateBudgetSummary(
  totalBudgetCents: number,
  guestCount: number,
  items: BudgetItemEntity[]
): BudgetFinancialSummary {
  assertNonNegativeCents(totalBudgetCents, "Total budget");

  if (!Number.isInteger(guestCount) || guestCount < 0) {
    throw new Error(`Guest count must be a non-negative integer. Received: ${guestCount}`);
  }

  let totalEstimatedCostCents = 0;
  let totalActualCostCents = 0;

  const categoryMap = new Map<
    string,
    { itemCount: number; estimated: number; actual: number }
  >();

  for (const item of items) {
    // Validate each item cost
    assertNonNegativeCents(item.estimatedCostCents, `Estimated cost for "${item.description}"`);
    assertNonNegativeCents(item.actualCostCents, `Actual cost for "${item.description}"`);

    // Only count active items (exclude CANCELLED items from calculations)
    if (item.status === "CANCELLED") {
      continue;
    }

    totalEstimatedCostCents += item.estimatedCostCents;
    totalActualCostCents += item.actualCostCents;

    const existing = categoryMap.get(item.category) ?? {
      itemCount: 0,
      estimated: 0,
      actual: 0,
    };
    existing.itemCount += 1;
    existing.estimated += item.estimatedCostCents;
    existing.actual += item.actualCostCents;
    categoryMap.set(item.category, existing);
  }

  const unallocatedBudgetCents = totalBudgetCents - totalEstimatedCostCents;
  const remainingCashCents = totalBudgetCents - totalActualCostCents;
  const varianceCents = totalEstimatedCostCents - totalActualCostCents;
  const isOverBudget = totalEstimatedCostCents > totalBudgetCents;
  const overrunCents = isOverBudget ? totalEstimatedCostCents - totalBudgetCents : 0;

  // Safe per-guest calculations (0 if zero guests)
  const perGuestEstimatedCents =
    guestCount > 0 ? Math.round(totalEstimatedCostCents / guestCount) : 0;
  const perGuestActualCents =
    guestCount > 0 ? Math.round(totalActualCostCents / guestCount) : 0;

  // Allocation percent rounded to 1 decimal place
  const allocationPercent =
    totalBudgetCents > 0
      ? Math.round((totalEstimatedCostCents / totalBudgetCents) * 1000) / 10
      : totalEstimatedCostCents > 0
      ? 100
      : 0;

  // Build sorted category subtotals
  const categorySubtotals: CategorySubtotal[] = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      itemCount: stats.itemCount,
      totalEstimatedCostCents: stats.estimated,
      totalActualCostCents: stats.actual,
      varianceCents: stats.estimated - stats.actual,
      formattedEstimated: formatCentsToCurrency(stats.estimated),
      formattedActual: formatCentsToCurrency(stats.actual),
    }))
    .sort((a, b) => b.totalEstimatedCostCents - a.totalEstimatedCostCents);

  return {
    totalBudgetCents,
    totalEstimatedCostCents,
    totalActualCostCents,
    unallocatedBudgetCents,
    remainingCashCents,
    varianceCents,
    isOverBudget,
    overrunCents,
    perGuestEstimatedCents,
    perGuestActualCents,
    allocationPercent,
    categorySubtotals,
  };
}
