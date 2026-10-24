import { describe, it, expect } from "vitest";
import {
  toCents,
  assertNonNegativeCents,
  allocateCentsByPercentages,
  MAX_SAFE_CENTS,
  MonetaryError,
} from "@/lib/domain/money";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { sampleBudgetItems } from "../fixtures/event-fixtures";
import type { BudgetItemEntity } from "@/lib/domain/schemas";

describe("Domain Money & Budget Calculations", () => {
  // 1. Sum multiple estimated costs accurately
  it("1. sums multiple estimated costs accurately without float drift", () => {
    const summary = calculateBudgetSummary(5000000, 100, sampleBudgetItems);
    // 1000000 + 1200000 + 400000 + 350000 = 2950000 cents ($29,500.00)
    expect(summary.totalEstimatedCostCents).toBe(2950000);
  });

  // 2. Sum actual spending accurately
  it("2. sums actual spending accurately", () => {
    const summary = calculateBudgetSummary(5000000, 100, sampleBudgetItems);
    // 950000 + 1250000 + 400000 + 0 = 2600000 cents ($26,000.00)
    expect(summary.totalActualCostCents).toBe(2600000);
  });

  // 3. Calculate remaining budget correctly
  it("3. calculates remaining budget correctly (both unallocated and cash balance)", () => {
    const totalBudget = 3500000; // $35,000
    const summary = calculateBudgetSummary(totalBudget, 120, sampleBudgetItems);
    // Unallocated = 3,500,000 - 2,950,000 = 550,000 cents ($5,500.00)
    expect(summary.unallocatedBudgetCents).toBe(550000);
    // Remaining Cash = 3,500,000 - 2,600,000 = 900,000 cents ($9,000.00)
    expect(summary.remainingCashCents).toBe(900000);
    expect(summary.isOverBudget).toBe(false);
  });

  // 4. Calculate budget variance correctly
  it("4. calculates budget variance correctly", () => {
    const summary = calculateBudgetSummary(3500000, 120, sampleBudgetItems);
    // Variance = totalEstimated - totalActual = 2,950,000 - 2,600,000 = 350,000 (favorable)
    expect(summary.varianceCents).toBe(350000);
  });

  // 5. Calculate per-guest costs correctly
  it("5. calculates per-guest costs correctly with integer rounding", () => {
    const summary = calculateBudgetSummary(3500000, 120, sampleBudgetItems);
    // Total Estimated: 2,950,000 / 120 = 24583.33 -> round to 24583 cents ($245.83/guest)
    expect(summary.perGuestEstimatedCents).toBe(24583);
    // Total Actual: 2,600,000 / 120 = 21666.66 -> round to 21667 cents ($216.67/guest)
    expect(summary.perGuestActualCents).toBe(21667);
  });

  // 6. Handle zero guests without division errors
  it("6. handles zero guests without division by zero errors", () => {
    const summary = calculateBudgetSummary(3500000, 0, sampleBudgetItems);
    expect(summary.perGuestEstimatedCents).toBe(0);
    expect(summary.perGuestActualCents).toBe(0);
    expect(summary.totalEstimatedCostCents).toBe(2950000);
  });

  // 7. Reject negative costs
  it("7. rejects negative costs in items and input validation", () => {
    expect(() => assertNonNegativeCents(-500, "Decor cost")).toThrowError(MonetaryError);

    const invalidItems: BudgetItemEntity[] = [
      {
        ...sampleBudgetItems[0]!,
        estimatedCostCents: -1000,
      },
    ];

    expect(() => calculateBudgetSummary(100000, 50, invalidItems)).toThrowError(
      MonetaryError
    );
  });

  // 8. Handle zero budget
  it("8. handles zero budget correctly and detects overruns", () => {
    const summary = calculateBudgetSummary(0, 10, sampleBudgetItems);
    expect(summary.totalBudgetCents).toBe(0);
    expect(summary.isOverBudget).toBe(true);
    expect(summary.overrunCents).toBe(2950000);
    expect(summary.unallocatedBudgetCents).toBe(-2950000);
  });

  // 9. Handle allocation totals above budget
  it("9. handles allocation totals above budget with explicit overrun flag", () => {
    const tightBudget = 2000000; // $20,000 (total estimated is $29,500)
    const summary = calculateBudgetSummary(tightBudget, 50, sampleBudgetItems);

    expect(summary.isOverBudget).toBe(true);
    expect(summary.overrunCents).toBe(950000); // $9,500 over
    expect(summary.unallocatedBudgetCents).toBe(-950000);
    expect(summary.allocationPercent).toBe(147.5);
  });

  // 10. Handle large integer-cent values safely
  it("10. handles large integer-cent values safely within safe limits", () => {
    const hugeItem: BudgetItemEntity = {
      ...sampleBudgetItems[0]!,
      estimatedCostCents: 50_000_000_00, // $50 Million
      actualCostCents: 45_000_000_00,
    };

    const summary = calculateBudgetSummary(100_000_000_00, 5000, [hugeItem]);
    expect(summary.totalEstimatedCostCents).toBe(50_000_000_00);
    expect(summary.unallocatedBudgetCents).toBe(50_000_000_00);
    expect(summary.perGuestEstimatedCents).toBe(1_000_000_00 / 100);

    // Exceeding maximum allowed
    expect(() => assertNonNegativeCents(MAX_SAFE_CENTS + 100)).toThrowError(
      MonetaryError
    );
  });

  // 11. Test decimal-to-cent conversion and rounding policy
  it("11. converts decimal amounts to integer cents with precise half-up rounding", () => {
    expect(toCents(12.5)).toBe(1250);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents("100")).toBe(10000);
    expect(toCents(0.004)).toBe(0);
    expect(toCents(0.006)).toBe(1);

    // Floating-point quirk guard (e.g. 19.99 * 100)
    expect(toCents(19.99)).toBe(1999);

    expect(() => toCents("not-a-number")).toThrowError(MonetaryError);

    // Deterministic Largest-Remainder Allocation
    const allocations = allocateCentsByPercentages(1000, [33.33, 33.33, 33.34]);
    const sum = allocations.reduce((a, b) => a + b, 0);
    expect(sum).toBe(1000);
    expect(allocations.length).toBe(3);
  });

  // 12. Test category subtotals
  it("12. groups and calculates category subtotals accurately", () => {
    const summary = calculateBudgetSummary(5000000, 100, sampleBudgetItems);
    expect(summary.categorySubtotals.length).toBe(4);

    const cateringSubtotal = summary.categorySubtotals.find((c) => c.category === "CATERING");
    expect(cateringSubtotal).toBeDefined();
    expect(cateringSubtotal?.itemCount).toBe(1);
    expect(cateringSubtotal?.totalEstimatedCostCents).toBe(1200000);
    expect(cateringSubtotal?.totalActualCostCents).toBe(1250000);
    expect(cateringSubtotal?.varianceCents).toBe(-50000); // $500 overrun on catering

    const venueSubtotal = summary.categorySubtotals.find((c) => c.category === "VENUE");
    expect(venueSubtotal?.totalEstimatedCostCents).toBe(1000000);
    expect(venueSubtotal?.totalActualCostCents).toBe(950000);
    expect(venueSubtotal?.varianceCents).toBe(50000); // $500 under budget
  });
});
