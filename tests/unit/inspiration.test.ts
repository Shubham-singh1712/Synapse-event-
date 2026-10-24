import { describe, it, expect } from "vitest";
import {
  CURATED_INSPIRATION_THEMES,
  filterInspirationThemes,
  formatCostRange,
  adaptDbIdeasToInspiration,
} from "@/lib/domain/inspiration";
import type { IdeaItemEntity } from "@/lib/domain/schemas";

describe("Celebration Inspiration Studio Domain Tests", () => {
  it("provides rich curated themes with valid image URLs and visual palettes", () => {
    expect(CURATED_INSPIRATION_THEMES.length).toBeGreaterThan(0);

    for (const theme of CURATED_INSPIRATION_THEMES) {
      expect(theme.id).toBeDefined();
      expect(theme.title).toBeTruthy();
      expect(theme.heroImage).toMatch(/^https:\/\//);
      expect(theme.heroAlt).toBeTruthy();
      expect(theme.colorPalette.length).toBeGreaterThanOrEqual(3);
      for (const swatch of theme.colorPalette) {
        expect(swatch.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(swatch.name).toBeTruthy();
      }
    }
  });

  it("filters themes by category accurately", () => {
    const cakes = filterInspirationThemes(
      CURATED_INSPIRATION_THEMES,
      "Cakes & Desserts",
      "",
      new Set()
    );
    expect(cakes.length).toBeGreaterThan(0);
    expect(cakes.every((t) => t.category === "Cakes & Desserts")).toBe(true);

    const all = filterInspirationThemes(
      CURATED_INSPIRATION_THEMES,
      "All Ideas",
      "",
      new Set()
    );
    expect(all.length).toBe(CURATED_INSPIRATION_THEMES.length);
  });

  it("filters themes by favourite IDs", () => {
    const favSet = new Set(["theme-bday-pastel-garden"]);
    const favs = filterInspirationThemes(
      CURATED_INSPIRATION_THEMES,
      "My Favourites",
      "",
      favSet
    );
    expect(favs.length).toBe(1);
    expect(favs[0]?.id).toBe("theme-bday-pastel-garden");
  });

  it("searches themes by title, description, or tag keywords", () => {
    const results = filterInspirationThemes(
      CURATED_INSPIRATION_THEMES,
      "All Ideas",
      "marigold",
      new Set()
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.title.toLowerCase()).toContain("marigold");
  });

  it("formats cost ranges deterministically with INR formatting", () => {
    const range = { minCents: 1500000, maxCents: 2500000 };
    const formatted = formatCostRange(range, "INR");
    expect(formatted).toContain("₹15,000");
    expect(formatted).toContain("₹25,000");

    expect(formatCostRange(undefined)).toBe("Cost estimate needed");
    expect(formatCostRange({ minCents: 0, maxCents: 0 })).toBe("Cost estimate needed");
  });

  it("adapts database IdeaItemEntity records into rich visual inspiration themes", () => {
    const mockDbIdeas: IdeaItemEntity[] = [
      {
        id: "idea-123",
        eventId: "event-456",
        category: "Cakes & Desserts",
        title: "Mango Rasmalai 3-Tier Cake",
        description: "Eggless infusion cake with saffron and pistachio",
        whyItFits: "Traditional meets modern fusion dessert",
        estimatedCostCents: 1200000,
        origin: "USER_CUSTOM",
        isCustomByUser: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const adapted = adaptDbIdeasToInspiration(mockDbIdeas, "BIRTHDAY");
    expect(adapted.length).toBe(1);
    expect(adapted[0]?.id).toBe("idea-123");
    expect(adapted[0]?.title).toBe("Mango Rasmalai 3-Tier Cake");
    expect(adapted[0]?.heroImage).toBeTruthy();
    expect(adapted[0]?.colorPalette.length).toBeGreaterThan(0);
    expect(adapted[0]?.estimatedCostRange?.minCents).toBeLessThanOrEqual(1200000);
  });
});
