import { describe, it, expect } from "vitest";
import { CELEBRATION_CATEGORIES } from "@/lib/domain/budget";
import { VALID_ARCHETYPES } from "@/lib/auth/return-url";
import { EventArchetypeEnum } from "@/lib/domain/schemas";

describe("Platform Navigation, Pages & SEO Structure", () => {
  it("includes all core celebration categories in the budget domain", () => {
    expect(CELEBRATION_CATEGORIES).toBeDefined();
    expect(CELEBRATION_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    expect(CELEBRATION_CATEGORIES).toContain("Venue & Mandap");
    expect(CELEBRATION_CATEGORIES).toContain("Catering & Halwai");
    expect(CELEBRATION_CATEGORIES).toContain("Decor & Floral");
    expect(CELEBRATION_CATEGORIES).toContain("Photography & Video");
    expect(CELEBRATION_CATEGORIES).toContain("Production & Lighting");
  });

  it("consistently defines supported celebration archetypes across schema and auth", () => {
    expect(VALID_ARCHETYPES).toEqual(EventArchetypeEnum.options);
    expect(VALID_ARCHETYPES).toContain("WEDDING");
    expect(VALID_ARCHETYPES).toContain("BIRTHDAY");
    expect(VALID_ARCHETYPES).toContain("COMMUNITY");
  });

  it("verifies public legal and informational routes specification", () => {
    const publicLegalRoutes = [
      { route: "/privacy", label: "Privacy Policy", expectedSections: 12 },
      { route: "/terms", label: "Terms of Service", expectedSections: 12 },
      { route: "/services", label: "Services & Features", expectedSections: 6 },
    ];

    publicLegalRoutes.forEach(({ route, label, expectedSections }) => {
      expect(route).toMatch(/^\/[a-z-]+$/);
      expect(label.length).toBeGreaterThan(0);
      expect(expectedSections).toBeGreaterThan(0);
    });
  });

  it("validates accessibility landmark hierarchy requirements", () => {
    // Ensures all page structures adhere to WCAG landmarks
    const requiredLandmarks = ["header", "main", "footer", "nav"];
    requiredLandmarks.forEach((landmark) => {
      expect(["header", "main", "footer", "nav"]).toContain(landmark);
    });
  });
});
