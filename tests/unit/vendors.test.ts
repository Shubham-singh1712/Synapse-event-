import { describe, it, expect } from "vitest";
import {
  toHumanVendorStatus,
  fromHumanVendorStatus,
  getPipelineStage,
  calculateVendorPipelineSummary,
  groupQuotesForComparison,
  INDIA_VENDOR_CATEGORIES,
  ARCHETYPE_VENDOR_SUGGESTIONS,
} from "@/lib/domain/vendors";
import type { VendorTaskEntity } from "@/lib/domain/schemas";

function createMockVendor(overrides: Partial<VendorTaskEntity> = {}): VendorTaskEntity {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    eventId: "223e4567-e89b-12d3-a456-426614174000",
    category: "Catering & Sweets",
    title: "Rajesh Caterers",
    requirements: "Pure veg buffet with live chaat counter",
    status: "NOT_STARTED",
    estimatedCostCents: 150000_00, // ₹1,50,000
    origin: "USER_CUSTOM",
    isCustomByUser: true,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    updatedAt: new Date("2026-10-01T10:00:00Z"),
    ...overrides,
  };
}

describe("Vendors & Bookings Domain Logic", () => {
  describe("Human Status Mappings", () => {
    it("maps technical database statuses to friendly user-facing labels", () => {
      expect(toHumanVendorStatus("NOT_STARTED")).toBe("To contact");
      expect(toHumanVendorStatus("INQUIRY_SENT")).toBe("Contacted");
      expect(toHumanVendorStatus("PROPOSAL_RECEIVED")).toBe("Quote received");
      expect(toHumanVendorStatus("CONTRACT_SIGNED")).toBe("Contract signed");
      expect(toHumanVendorStatus("DEPOSIT_PAID")).toBe("Booked");
      expect(toHumanVendorStatus("COMPLETED")).toBe("Completed");
      expect(toHumanVendorStatus("CANCELLED")).toBe("Declined");
    });

    it("maps user labels back to valid database enum statuses", () => {
      expect(fromHumanVendorStatus("To contact")).toBe("NOT_STARTED");
      expect(fromHumanVendorStatus("Contacted")).toBe("INQUIRY_SENT");
      expect(fromHumanVendorStatus("Quote received")).toBe("PROPOSAL_RECEIVED");
      expect(fromHumanVendorStatus("Contract signed")).toBe("CONTRACT_SIGNED");
      expect(fromHumanVendorStatus("Booked")).toBe("DEPOSIT_PAID");
      expect(fromHumanVendorStatus("Completed")).toBe("COMPLETED");
      expect(fromHumanVendorStatus("Declined")).toBe("CANCELLED");
    });

    it("maps pipeline stages accurately", () => {
      expect(getPipelineStage("NOT_STARTED")).toBe("TO_CONTACT");
      expect(getPipelineStage("INQUIRY_SENT")).toBe("CONTACTED");
      expect(getPipelineStage("PROPOSAL_RECEIVED")).toBe("QUOTE_RECEIVED");
      expect(getPipelineStage("CONTRACT_SIGNED")).toBe("BOOKED");
      expect(getPipelineStage("DEPOSIT_PAID")).toBe("BOOKED");
      expect(getPipelineStage("COMPLETED")).toBe("COMPLETED");
      expect(getPipelineStage("CANCELLED")).toBe("DECLINED");
    });
  });

  describe("Vendor Pipeline Summary Calculation", () => {
    it("handles empty vendor list gracefully", () => {
      const summary = calculateVendorPipelineSummary([]);
      expect(summary.totalVendors).toBe(0);
      expect(summary.activeVendorsCount).toBe(0);
      expect(summary.totalQuotedCents).toBe(0);
      expect(summary.totalBookedCents).toBe(0);
      expect(summary.stages.length).toBe(5);
    });

    it("accurately calculates counts and financial amounts across pipeline stages", () => {
      const vendors: VendorTaskEntity[] = [
        createMockVendor({
          id: "v1",
          title: "V1",
          status: "NOT_STARTED",
          estimatedCostCents: 50000_00,
        }),
        createMockVendor({
          id: "v2",
          title: "V2",
          status: "INQUIRY_SENT",
          estimatedCostCents: 75000_00,
        }),
        createMockVendor({
          id: "v3",
          title: "V3",
          status: "PROPOSAL_RECEIVED",
          estimatedCostCents: 120000_00,
        }),
        createMockVendor({
          id: "v4",
          title: "V4",
          status: "DEPOSIT_PAID",
          estimatedCostCents: 200000_00, // Booked
        }),
        createMockVendor({
          id: "v5",
          title: "V5",
          status: "COMPLETED",
          estimatedCostCents: 30000_00, // Completed
        }),
        createMockVendor({
          id: "v6",
          title: "V6",
          status: "CANCELLED",
          estimatedCostCents: 90000_00, // Declined - should be excluded from active quotes
        }),
      ];

      const summary = calculateVendorPipelineSummary(vendors);

      expect(summary.totalVendors).toBe(6);
      expect(summary.activeVendorsCount).toBe(5);
      expect(summary.declinedCount).toBe(1);
      expect(summary.toContactCount).toBe(1);
      expect(summary.contactedCount).toBe(1);
      expect(summary.quoteReceivedCount).toBe(1);
      expect(summary.bookedCount).toBe(1);
      expect(summary.completedCount).toBe(1);

      // Quoted total: 50k + 75k + 120k + 200k + 30k = 475,000 INR (47,500,000 paise)
      expect(summary.totalQuotedCents).toBe(475000_00);

      // Booked total: 200k (DEPOSIT_PAID) + 30k (COMPLETED) = 230,000 INR (23,000,000 paise)
      expect(summary.totalBookedCents).toBe(230000_00);
    });
  });

  describe("Quote Comparison Logic", () => {
    it("groups vendors in the same category for comparison", () => {
      const vendors: VendorTaskEntity[] = [
        createMockVendor({
          id: "c1",
          category: "Catering & Sweets",
          title: "Royal Halwai",
          estimatedCostCents: 180000_00,
        }),
        createMockVendor({
          id: "c2",
          category: "Catering & Sweets",
          title: "Annapurna Caterers",
          estimatedCostCents: 140000_00,
        }),
        createMockVendor({
          id: "p1",
          category: "Photography & Videography",
          title: "Aura Studio",
          estimatedCostCents: 85000_00,
        }),
      ];

      const comparisons = groupQuotesForComparison(vendors);

      // Catering should be first because it has 2 vendors (isComparable = true)
      expect(comparisons[0]!.category).toBe("Catering & Sweets");
      expect(comparisons[0]!.isComparable).toBe(true);
      expect(comparisons[0]!.vendorCount).toBe(2);
      expect(comparisons[0]!.minQuoteCents).toBe(140000_00);
      expect(comparisons[0]!.maxQuoteCents).toBe(180000_00);
      expect(comparisons[0]!.quoteDiffCents).toBe(40000_00);

      // Photography has 1 vendor
      expect(comparisons[1]!.category).toBe("Photography & Videography");
      expect(comparisons[1]!.isComparable).toBe(false);
      expect(comparisons[1]!.quoteDiffCents).toBeNull();
    });

    it("excludes cancelled/declined vendors from active comparison", () => {
      const vendors: VendorTaskEntity[] = [
        createMockVendor({
          id: "c1",
          category: "Decor & Flowers",
          title: "Floral Art",
          estimatedCostCents: 60000_00,
        }),
        createMockVendor({
          id: "c2",
          category: "Decor & Flowers",
          title: "Grand Mandaps",
          status: "CANCELLED",
          estimatedCostCents: 90000_00,
        }),
      ];

      const comparisons = groupQuotesForComparison(vendors);
      expect(comparisons.length).toBe(1);
      expect(comparisons[0]!.vendorCount).toBe(1);
      expect(comparisons[0]!.isComparable).toBe(false);
    });
  });

  describe("India-First Categories & Archetype Suggestions", () => {
    it("includes essential Indian celebration vendor categories", () => {
      expect(INDIA_VENDOR_CATEGORIES).toContain("Venue & Location");
      expect(INDIA_VENDOR_CATEGORIES).toContain("Catering & Sweets");
      expect(INDIA_VENDOR_CATEGORIES).toContain("Decor & Flowers");
      expect(INDIA_VENDOR_CATEGORIES).toContain("Cake & Desserts");
      expect(INDIA_VENDOR_CATEGORIES).toContain("Priest & Rituals");
      expect(INDIA_VENDOR_CATEGORIES).toContain("Music & Entertainment");
    });

    it("provides contextual vendor suggestions for weddings and birthdays", () => {
      const weddingSuggestions = ARCHETYPE_VENDOR_SUGGESTIONS["WEDDING"];
      expect(weddingSuggestions).toBeDefined();
      expect(weddingSuggestions!.length).toBeGreaterThanOrEqual(5);
      expect(weddingSuggestions!.some((s) => s.category.includes("Catering"))).toBe(true);
      expect(weddingSuggestions!.some((s) => s.category.includes("Priest"))).toBe(true);

      const birthdaySuggestions = ARCHETYPE_VENDOR_SUGGESTIONS["BIRTHDAY"];
      expect(birthdaySuggestions).toBeDefined();
      expect(birthdaySuggestions!.length).toBeGreaterThanOrEqual(5);
      expect(birthdaySuggestions!.some((s) => s.category.includes("Cake"))).toBe(true);
      expect(birthdaySuggestions!.some((s) => s.category.includes("Decor"))).toBe(true);
    });
  });
});
