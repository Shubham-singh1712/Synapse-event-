/**
 * Domain Money & Currency Module — India-First Architecture
 *
 * All monetary calculations inside SynapseEvent strictly use integer minor units
 * (paise for INR, cents for USD).
 *
 * Floating-point representation is strictly forbidden for storage, arithmetic,
 * and state transitions to prevent precision drift and rounding anomalies.
 */

export const MAX_SAFE_CENTS = 1_000_000_000_00; // 1 Billion in minor units (well within Number.MAX_SAFE_INTEGER)
export const MIN_SAFE_CENTS = 0;
export const DEFAULT_CURRENCY = "INR";

export class MonetaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonetaryError";
  }
}

/**
 * Validates that two entities share the identical currency code.
 * Prevents accidental cross-currency arithmetic (e.g. INR with USD).
 */
export function assertMatchingCurrency(
  currencyA: string,
  currencyB: string,
  context = "Monetary operation"
): void {
  if (currencyA.toUpperCase() !== currencyB.toUpperCase()) {
    throw new MonetaryError(
      `${context}: Cannot perform arithmetic between mismatched currencies (${currencyA} and ${currencyB}).`
    );
  }
}

/**
 * Converts a decimal major unit amount (or string representation) into exact integer minor units
 * (paise for INR, cents for USD). Applies half-up rounding on fractional sub-units.
 */
export function toCents(value: number | string): number {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new MonetaryError(`Invalid decimal currency string: "${value}"`);
    }
    const num = Number.parseFloat(trimmed);
    if (!Number.isFinite(num)) {
      throw new MonetaryError(`Invalid currency number from string: "${value}"`);
    }
    return Math.round(num * 100);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MonetaryError(`Invalid currency value: ${value}`);
  }

  // Prevent floating point quirks like 19.99 * 100 = 1998.9999999999998
  return Math.round((value + Number.EPSILON) * 100);
}

/**
 * Aliases for domain clarity when working in an India-first context.
 */
export const toPaise = toCents;
export const toMinorUnits = toCents;

/**
 * Validates that an amount is a safe, nonnegative integer representing minor units (paise/cents).
 */
export function assertNonNegativeCents(cents: number, fieldName = "Cost"): void {
  if (typeof cents !== "number" || !Number.isFinite(cents)) {
    throw new MonetaryError(`${fieldName} must be a finite number. Received: ${cents}`);
  }
  if (!Number.isInteger(cents)) {
    throw new MonetaryError(`${fieldName} must be an integer (in paise/cents). Received fractional: ${cents}`);
  }
  if (cents < 0) {
    throw new MonetaryError(`${fieldName} cannot be negative. Received: ${cents}`);
  }
  if (cents > MAX_SAFE_CENTS) {
    throw new MonetaryError(`${fieldName} exceeds maximum safe value. Received: ${cents}`);
  }
}

/**
 * Formats integer minor units into a standard currency string.
 *
 * For INR:
 * - Symbol: ₹
 * - Digit grouping: Indian numbering system (e.g., ₹1,500, ₹25,000, ₹1,25,000, ₹12,50,000)
 * - Omits decimal zeroes if exact whole rupees, includes paise if present.
 *
 * For USD:
 * - Symbol: $
 * - Standard US grouping: $125.00
 */
export function formatCentsToCurrency(cents: number, currency: string = DEFAULT_CURRENCY): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const majorUnits = Math.floor(absCents / 100);
  const remainingMinor = absCents % 100;
  const sign = isNegative ? "-" : "";
  const upperCurrency = (currency || DEFAULT_CURRENCY).toUpperCase();

  if (upperCurrency === "INR") {
    // Indian digit grouping: format majorUnits using en-IN
    const formattedRupees = majorUnits.toLocaleString("en-IN");
    if (remainingMinor === 0) {
      return `${sign}₹${formattedRupees}`;
    }
    const paddedPaise = remainingMinor.toString().padStart(2, "0");
    return `${sign}₹${formattedRupees}.${paddedPaise}`;
  }

  if (upperCurrency === "USD") {
    const paddedCents = remainingMinor.toString().padStart(2, "0");
    return `${sign}$${majorUnits.toLocaleString("en-US")}.${paddedCents}`;
  }

  // Generic fallback for other ISO currencies
  const padded = remainingMinor.toString().padStart(2, "0");
  return `${sign}${upperCurrency} ${majorUnits.toLocaleString()}.${padded}`;
}

export const formatCurrency = formatCentsToCurrency;
export const formatPaiseToRupees = formatCentsToCurrency;

/**
 * Deterministically distributes totalCents across an array of percentage shares (0 to 100).
 * Uses the Largest Remainder Method (Hamilton-Hare) to guarantee:
 *   sum(allocated) === totalCents exactly, with zero dropped paise/cents.
 */
export function allocateCentsByPercentages(
  totalCents: number,
  percentages: number[]
): number[] {
  assertNonNegativeCents(totalCents, "Total budget");

  if (percentages.length === 0) return [];
  if (totalCents === 0) return percentages.map(() => 0);

  const percentSum = percentages.reduce((acc, p) => acc + p, 0);
  if (percentSum <= 0) {
    throw new MonetaryError("Sum of percentage allocations must be greater than zero.");
  }

  // Calculate baseline floor amounts and remainder fractions
  const allocations: number[] = [];
  const remainders: { index: number; remainder: number }[] = [];
  let allocatedTotal = 0;

  for (let i = 0; i < percentages.length; i++) {
    const rawCents = (totalCents * percentages[i]!) / percentSum;
    const floorCents = Math.floor(rawCents);
    allocations.push(floorCents);
    allocatedTotal += floorCents;
    remainders.push({ index: i, remainder: rawCents - floorCents });
  }

  // Distribute remaining cents to largest remainders first
  let remainingCentsToDistribute = totalCents - allocatedTotal;
  remainders.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remainders.length && remainingCentsToDistribute > 0; i++) {
    const itemIndex = remainders[i]!.index;
    allocations[itemIndex] = (allocations[itemIndex] ?? 0) + 1;
    remainingCentsToDistribute--;
  }

  return allocations;
}
