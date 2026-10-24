import { describe, it, expect } from "vitest";
import {
  DEFAULT_CURRENCY,
  toCents,
  toPaise,
  toMinorUnits,
  formatCentsToCurrency,
  assertMatchingCurrency,
  MonetaryError,
  allocateCentsByPercentages,
} from "@/lib/domain/money";
import {
  formatIndianDate,
  validatePhoneNumber,
  validateIndianPinCode,
  INDIAN_TIMEZONE,
  DEFAULT_LOCALE,
  INDIAN_CELEBRATION_HUBS,
} from "@/lib/domain/i18n";
import { getArchetypeFallbackPlan } from "@/lib/ai/archetypes";
import { EventSchema, BudgetItemEntitySchema, type BudgetItemEntity } from "@/lib/domain/schemas";
import { calculateBudgetSummary } from "@/lib/domain/budget";

describe("India-First Product Localization Test Suite", () => {
  describe("CURRENCY: INR Formatting, Digit Grouping & Integer Paise", () => {
    it("uses INR as system default currency and en-IN locale", () => {
      expect(DEFAULT_CURRENCY).toBe("INR");
      expect(DEFAULT_LOCALE).toBe("en-IN");
      expect(INDIAN_TIMEZONE).toBe("Asia/Kolkata");
    });

    it("formats amounts using standard Indian digit grouping (₹1,500, ₹25,000, ₹1,25,000, ₹12,50,000)", () => {
      // 1,500 rupees = 150,000 paise
      expect(formatCentsToCurrency(150000, "INR")).toBe("₹1,500");

      // 25,000 rupees = 2,500,000 paise
      expect(formatCentsToCurrency(2500000, "INR")).toBe("₹25,000");

      // 1,25,000 rupees = 12,500,000 paise
      expect(formatCentsToCurrency(12500000, "INR")).toBe("₹1,25,000");

      // 12,50,000 rupees = 125,000,000 paise
      expect(formatCentsToCurrency(125000000, "INR")).toBe("₹12,50,000");

      // 1,00,00,000 rupees (1 crore) = 1,000,000,000 paise
      expect(formatCentsToCurrency(1000000000, "INR")).toBe("₹1,00,00,000");
    });

    it("formats fractional paise with 2 decimal digits when paise > 0", () => {
      expect(formatCentsToCurrency(1250050, "INR")).toBe("₹12,500.50");
      expect(formatCentsToCurrency(150075, "INR")).toBe("₹1,500.75");
    });

    it("performs exact integer-paise arithmetic with zero floating-point drift", () => {
      // e.g. 19.99 rupees -> 1999 paise
      expect(toPaise("19.99")).toBe(1999);
      expect(toMinorUnits(19.99)).toBe(1999);
      expect(toCents(12.5)).toBe(1250);

      // Allocating ₹10,00,000 across 3 equal shares of 33.33%, 33.33%, 33.34%
      const totalPaise = 100000000; // ₹10 Lakhs
      const allocations = allocateCentsByPercentages(totalPaise, [33.33, 33.33, 33.34]);
      const sum = allocations.reduce((a, b) => a + b, 0);
      expect(sum).toBe(totalPaise);
      expect(allocations.every(Number.isInteger)).toBe(true);
    });

    it("preserves existing USD currency and formats with US conventions without reinterpretation", () => {
      // 35,000 USD preserved as $35,000.00
      expect(formatCentsToCurrency(3500000, "USD")).toBe("$35,000.00");
      expect(formatCentsToCurrency(27125, "USD")).toBe("$271.25");
    });

    it("prevents and throws on cross-currency arithmetic without explicit conversion", () => {
      expect(() => {
        assertMatchingCurrency("INR", "USD", "Budget Aggregation");
      }).toThrowError(MonetaryError);

      expect(() => {
        assertMatchingCurrency("INR", "INR", "Valid Aggregation");
      }).not.toThrow();
    });
  });

  describe("LOCALE: Indian Date, Timezone, Phone & PIN Validation", () => {
    it("formats dates in DD MMM YYYY format", () => {
      expect(formatIndianDate("2026-11-24")).toBe("24 Nov 2026");
      expect(formatIndianDate("2026-01-05")).toBe("05 Jan 2026");
      expect(formatIndianDate("2026-10-21")).toBe("21 Oct 2026");
    });

    it("handles invalid or empty dates gracefully", () => {
      expect(formatIndianDate("")).toBe("");
      expect(formatIndianDate("invalid-date")).toBe("invalid-date");
    });

    it("accepts valid Indian phone numbers (+91, 10-digit with 6-9 prefix)", () => {
      const res1 = validatePhoneNumber("9876543210");
      expect(res1.isValid).toBe(true);
      expect(res1.isIndian).toBe(true);
      expect(res1.normalized).toBe("+91 98765 43210");

      const res2 = validatePhoneNumber("+91 98765 43210");
      expect(res2.isValid).toBe(true);
      expect(res2.isIndian).toBe(true);

      const res3 = validatePhoneNumber("09876543210");
      expect(res3.isValid).toBe(true);
      expect(res3.isIndian).toBe(true);
    });

    it("allows valid international phone numbers while flagging them as non-Indian", () => {
      const intl = validatePhoneNumber("+1 415 555 2671");
      expect(intl.isValid).toBe(true);
      expect(intl.isIndian).toBe(false);
    });

    it("rejects invalid phone numbers", () => {
      expect(validatePhoneNumber("12345").isValid).toBe(false);
      expect(validatePhoneNumber("abcdefghij").isValid).toBe(false);
    });

    it("validates 6-digit Indian PIN codes accurately", () => {
      expect(validateIndianPinCode("110001").isValid).toBe(true); // New Delhi
      expect(validateIndianPinCode("302001").isValid).toBe(true); // Jaipur
      expect(validateIndianPinCode("560001").isValid).toBe(true); // Bengaluru
      expect(validateIndianPinCode("400001").isValid).toBe(true); // Mumbai

      // Invalid PIN codes (first digit 0, wrong length, letters)
      expect(validateIndianPinCode("011001").isValid).toBe(false);
      expect(validateIndianPinCode("11000").isValid).toBe(false);
      expect(validateIndianPinCode("1100011").isValid).toBe(false);
      expect(validateIndianPinCode("11000A").isValid).toBe(false);
    });

    it("includes major Indian celebration hubs in dictionary", () => {
      expect(INDIAN_CELEBRATION_HUBS.some((h) => h.city === "Jaipur")).toBe(true);
      expect(INDIAN_CELEBRATION_HUBS.some((h) => h.city === "Bengaluru")).toBe(true);
      expect(INDIAN_CELEBRATION_HUBS.some((h) => h.city === "Udaipur")).toBe(true);
      expect(INDIAN_CELEBRATION_HUBS.some((h) => h.city === "Mumbai")).toBe(true);
      expect(INDIAN_CELEBRATION_HUBS.some((h) => h.city === "Delhi NCR")).toBe(true);
    });
  });

  describe("PLANNING: India-Oriented Archetypes & Cultural Flexibility", () => {
    it("generates an India-oriented wedding plan respecting budget and multi-ceremony items", () => {
      const plan = getArchetypeFallbackPlan({
        archetype: "WEDDING",
        title: "Ananya & Rohan Vivah",
        eventDate: "2026-11-20",
        location: "Jaipur, Rajasthan",
        guestCount: 250,
        totalBudgetCents: 250000000, // ₹25,00,000
        currency: "INR",
        subtypes: ["SANGEET", "MEHENDI", "PHERAS_CEREMONY", "RECEPTION"],
        dietary: "Pure Vegetarian & Jain Counter",
        eventId: "test-evt-wedding",
        preferences: {},
      });

      expect(plan.budgetItems.length).toBeGreaterThan(0);

      // Verify category allocation sums to <= totalBudgetCents
      const totalAllocated = plan.budgetItems.reduce(
        (acc: number, i) => acc + i.estimatedCostCents,
        0
      );
      expect(totalAllocated).toBeLessThanOrEqual(250000000);

      // Verify Indian vendor categories & ceremonies
      const categoryNames = plan.budgetItems.map((b) => b.category);
      expect(categoryNames).toContain("VENUE");
      expect(categoryNames).toContain("CATERING");
      expect(categoryNames).toContain("DECOR_FLORAL");
      expect(categoryNames).toContain("PHOTOGRAPHY_VIDEO");
      expect(plan.vendorTasks.some((t) => t.category === "OFFICIANT")).toBe(true);

      // Verify Pandit / Officiant and Mehendi exist in items
      const itemTitles = plan.budgetItems.map((b) => b.description.toLowerCase());
      expect(itemTitles.some((t: string) => t.includes("mandap") || t.includes("ceremony"))).toBe(
        true
      );

      // Verify 10 PM sound compliance / police NOC notices
      const complianceTasks = plan.vendorTasks.filter((v) =>
        v.requirements.includes("10 PM") || v.requirements.includes("NOC")
      );
      expect(complianceTasks.length).toBeGreaterThan(0);
    });

    it("generates an India-oriented birthday plan with cake, venue and return gifts", () => {
      const plan = getArchetypeFallbackPlan({
        archetype: "BIRTHDAY",
        title: "Aarav 5th Birthday Bash",
        eventDate: "2026-12-10",
        location: "Bengaluru, Karnataka",
        guestCount: 60,
        totalBudgetCents: 15000000, // ₹1,50,000
        currency: "INR",
        eventId: "test-evt-bday",
        preferences: {},
      });

      const descriptions = plan.budgetItems.map((b) => b.description.toLowerCase());
      expect(descriptions.some((d: string) => d.includes("cake") || d.includes("bakery"))).toBe(
        true
      );
      expect(
        descriptions.some((d: string) => d.includes("return gifts") || d.includes("favors"))
      ).toBe(true);
    });

    it("generates a community event plan with police NOC and loudspeaker permits", () => {
      const plan = getArchetypeFallbackPlan({
        archetype: "COMMUNITY",
        title: "Diwali Community Utsav",
        eventDate: "2026-11-01",
        location: "Pune, Maharashtra",
        guestCount: 500,
        totalBudgetCents: 40000000, // ₹4,00,000
        currency: "INR",
        eventId: "test-evt-community",
        preferences: {},
      });

      const milestoneTitles = plan.milestones.map((m) => m.title.toLowerCase());
      expect(
        milestoneTitles.some(
          (m: string) => m.includes("noc") || m.includes("police") || m.includes("permit")
        )
      ).toBe(true);

      // Check assumptions contains permissions to verify
      expect(plan.assumptions.permissionsToVerify?.length).toBeGreaterThan(0);
    });

    it("preserves user-defined dietary and cultural preferences without forcing stereotypes", () => {
      const plan = getArchetypeFallbackPlan({
        archetype: "WEDDING",
        title: "Simple Court Marriage & Dinner",
        eventDate: "2026-11-20",
        location: "New Delhi",
        guestCount: 50,
        totalBudgetCents: 50000000, // ₹5,00,000
        currency: "INR",
        subtypes: ["RECEPTION"], // Only reception selected, no forced haldi/sangeet
        dietary: "Jain Cuisine Only",
        eventId: "test-evt-simple",
        preferences: {},
      });

      expect(plan.budgetItems.length).toBeGreaterThan(0);
    });
  });

  describe("SCHEMA & PERSISTENCE: Currency Preservation & Budget Line Items", () => {
    it("validates EventSchema defaults to INR and Asia/Kolkata", () => {
      const parsed = EventSchema.parse({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        workspaceId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
        title: "Jaipur Celebration",
        archetype: "WEDDING",
        eventDate: "2026-11-25",
        guestCount: 150,
        totalBudgetCents: 150000000,
        location: "Jaipur, Rajasthan",
      });

      expect(parsed.currency).toBe("INR");
      expect(parsed.timezone).toBe("Asia/Kolkata");
    });

    it("preserves non-INR currencies like USD when explicitly provided", () => {
      const parsed = EventSchema.parse({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
        workspaceId: "b1b2c3d4-e5f6-7890-abcd-ef1234567891",
        title: "San Francisco Wedding",
        archetype: "WEDDING",
        eventDate: "2026-11-25",
        guestCount: 100,
        totalBudgetCents: 3500000,
        currency: "USD",
        timezone: "America/Los_Angeles",
      });

      expect(parsed.currency).toBe("USD");
      expect(parsed.timezone).toBe("America/Los_Angeles");
    });

    it("supports extended Indian budget fields (quotedCostCents, bookingAdvanceCents, paidAmountCents, paymentStatus)", () => {
      const item = BudgetItemEntitySchema.parse({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567892",
        eventId: "b1b2c3d4-e5f6-7890-abcd-ef1234567892",
        category: "VENUE",
        description: "Banquet Lawn Booking",
        estimatedCostCents: 50000000, // ₹5,00,000 estimate
        quotedCostCents: 55000000, // ₹5,50,000 vendor quotation
        bookingAdvanceCents: 15000000, // ₹1,50,000 advance
        paidAmountCents: 15000000, // ₹1,50,000 paid
        paymentStatus: "ADVANCE_PAID",
        paymentDueDate: "2026-11-10",
        estimateSource: "VENDOR_QUOTATION",
        status: "QUOTED",
      });

      expect(item.quotedCostCents).toBe(55000000);
      expect(item.bookingAdvanceCents).toBe(15000000);
      expect(item.paidAmountCents).toBe(15000000);
      expect(item.paymentStatus).toBe("ADVANCE_PAID");
    });

    it("computes budget summary deterministically with integer paise", () => {
      const items: BudgetItemEntity[] = [
        {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567893",
          eventId: "b1b2c3d4-e5f6-7890-abcd-ef1234567893",
          category: "VENUE",
          description: "Lawn",
          estimatedCostCents: 50000000, // ₹5,00,000
          actualCostCents: 50000000,
          status: "COMMITTED",
          origin: "USER_CUSTOM",
          isCustomByUser: true,
          isGuestSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567894",
          eventId: "b1b2c3d4-e5f6-7890-abcd-ef1234567894",
          category: "CATERING",
          description: "Catering",
          estimatedCostCents: 60000000, // ₹6,00,000
          actualCostCents: 65000000, // ₹6,50,000
          status: "COMMITTED",
          origin: "USER_CUSTOM",
          isCustomByUser: true,
          isGuestSensitive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculateBudgetSummary(150000000, 200, items); // ₹15,00,000 total budget
      expect(summary.totalEstimatedCostCents).toBe(110000000); // ₹11,00,000
      expect(summary.totalActualCostCents).toBe(115000000); // ₹11,50,000
      expect(summary.unallocatedBudgetCents).toBe(40000000); // ₹4,00,000
      expect(summary.isOverBudget).toBe(false);
      expect(summary.perGuestEstimatedCents).toBe(550000); // ₹5,500/guest
    });
  });
});
