import type { GenerateEventPlanRequest, AiGeneratedPlanResponse } from "@/lib/domain/ai-contracts";
import { allocateCentsByPercentages, formatCentsToCurrency } from "@/lib/domain/money";
import { addDaysToDate } from "@/lib/domain/timeline";

export const WEDDING_SYSTEM_PROMPT = `You are SynapseEvent's India-first wedding planning intelligence engine.
Your task is to generate a comprehensive, highly personalized, culturally respectful, and structurally valid Indian wedding plan.

CRITICAL INSTRUCTIONS:
1. Adhere strictly to the requested JSON schema.
2. The user has set an exact total budget in integer minor units (paise for INR or cents for USD) and an estimated guest count.
3. Every budget item MUST have a non-negative estimatedCostCents (in paise/minor units).
4. Mark catering, guest accommodation, and head-count sensitive items with isGuestSensitive = true. Fixed items (DJ, photo, venue base) must be false.
5. All dates for milestones must be YYYY-MM-DD calculated relative to the event date.
6. Support optional sub-ceremonies if specified by the user (e.g. Engagement, Mehendi, Haldi, Sangeet, Baraat, Wedding Ceremony / Pheras, Reception).
7. Incorporate user dietary preferences (e.g. Pure Vegetarian, Jain, Multi-Cuisine, Live Chaat Counters) and cultural traditions.
8. Clearly state that estimates are planning benchmarks and require formal vendor quotes. Do NOT fabricate vendor business names or unverified quotes.
9. Remind the user about local municipal permissions (e.g. 10 PM sound restrictions, fire safety for cold pyros / havan, police NOC for baraat processions).
10. Output ONLY valid JSON conforming to the schema. No conversational preamble.`;

export function generateWeddingFallbackPlan(
  req: GenerateEventPlanRequest
): AiGeneratedPlanResponse {
  const total = req.totalBudgetCents;
  const guests = Math.max(1, req.guestCount);
  const eventDate = req.eventDate;
  const currency = req.currency || "INR";

  // Check optional ceremonies requested in preferences or subtypes
  const ceremonies = (req.subtypes && req.subtypes.length > 0)
    ? req.subtypes
    : ["MEHENDI", "SANGEET", "WEDDING_CEREMONY", "RECEPTION"];

  const hasSangeet = ceremonies.includes("SANGEET");
  const hasMehendi = ceremonies.includes("MEHENDI");

  // Allocation benchmark for Indian Wedding:
  // Banquet/Lawn Venue (32%), Catering & Sweets (32%), Decor & Mandap (12%),
  // Photo & Cinema (10%), Music/DJ/Dhol (5%), Bridal Makeup & Mehendi (4%), Contingency (5%)
  const shares = [32, 32, 12, 10, 5, 4, 5];
  const [venueCost, cateringCost, decorCost, photoCost, djCost, makeupCost, bufferCost] =
    allocateCentsByPercentages(total, shares);

  const perGuestCatering = Math.round((cateringCost ?? 0) / guests);

  return {
    budgetItems: [
      {
        category: "VENUE",
        description: `Banquet Hall / Wedding Lawn & Facilities (${req.location || "City Venue"})`,
        estimatedCostCents: venueCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Includes main hall, lawn access, air conditioning, basic power backup & 2 green rooms.",
      },
      {
        category: "CATERING",
        description: `Grand Feast & Live Counters (${guests} guests — ${req.dietary || "Multi-Cuisine / Pure Veg"})`,
        estimatedCostCents: cateringCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: true,
        estimatedUnitCostCents: perGuestCatering,
        assumptions: `Estimated at ~${formatCentsToCurrency(perGuestCatering, currency)} per guest covering welcome drinks, chaat counter, main buffet & dessert spread.`,
      },
      {
        category: "DECOR_FLORAL",
        description: `Mandap Architecture, Floral Stage, Entrance & Tent House Setup`,
        estimatedCostCents: decorCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Covers floral mandap, stage backdrop, ambient lighting, guest seating & pathway florals.",
      },
      {
        category: "PHOTOGRAPHY_VIDEO",
        description: "Traditional & Candid Photography, Cinematic Highlight Film & Drone Coverage",
        estimatedCostCents: photoCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Complete coverage across pre-wedding festivities and wedding day with raw photos & edited album.",
      },
      {
        category: "ENTERTAINMENT",
        description: hasSangeet
          ? "Sangeet Sound & Light Setup, DJ, Wireless Mics & Dhol Players"
          : "Celebration Sound System, DJ & Dhol Procession",
        estimatedCostCents: djCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Professional sound system, dance floor lighting, and traditional dhol for baraat entrance.",
      },
      {
        category: "MISCELLANEOUS",
        description: hasMehendi
          ? "Bridal Makeup, Hairstyling & Master Mehendi Artist Services"
          : "Bridal Makeup & Hairstyling Services",
        estimatedCostCents: makeupCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Includes bridal pre-ceremony styling, drapery, trial session, and family mehendi artists.",
      },
      {
        category: "BUFFER_CONTINGENCY",
        description: "Contingency Reserve for Shagun, Vendor Tips & Unforeseen Overages",
        estimatedCostCents: bufferCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Emergency funds for extra guest plates, additional generator fuel, and last-minute transport.",
      },
    ],
    milestones: [
      {
        title: "Lock Banquet / Lawn Venue & Deposit Advance Token",
        description: "Verify dates, capacity for all ceremonies, parking facilities, and confirm booking advance.",
        dueAt: addDaysToDate(eventDate, -180),
        offsetDaysFromEvent: -180,
        status: "NOT_STARTED",
        priority: "CRITICAL",
        dependencies: [],
      },
      {
        title: "Book Caterer & Taste Signature Menu Items",
        description: "Finalize live food stalls, chaat station, dietary options (Pure Veg/Jain/Non-Veg), and sweet selections.",
        dueAt: addDaysToDate(eventDate, -120),
        offsetDaysFromEvent: -120,
        status: "NOT_STARTED",
        priority: "HIGH",
        dependencies: ["Lock Banquet / Lawn Venue & Deposit Advance Token"],
      },
      {
        title: "Contract Photographer, Videographer & Drone Pilot",
        description: "Review candid portfolios, agree on deliverables (teaser, full video, coffee table album).",
        dueAt: addDaysToDate(eventDate, -90),
        offsetDaysFromEvent: -90,
        status: "NOT_STARTED",
        priority: "HIGH",
        dependencies: [],
      },
      {
        title: "Finalize Mandap, Stage Decor & Lighting Concepts",
        description: "Align theme colors, floral selections (marigold, jasmine, roses), and stage backdrop with decorator.",
        dueAt: addDaysToDate(eventDate, -60),
        offsetDaysFromEvent: -60,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        dependencies: [],
      },
      {
        title: "Confirm Bridal Makeup Artist, Mehendi & Pandit Ji / Officiant",
        description: "Book bridal slots, mehendi team for guests, and confirm samagri checklist with Pandit ji.",
        dueAt: addDaysToDate(eventDate, -45),
        offsetDaysFromEvent: -45,
        status: "NOT_STARTED",
        priority: "HIGH",
        dependencies: [],
      },
      {
        title: "Verify Sound Permissions & Municipal Sound Cutoff",
        description: "Confirm compliance with local sound regulations (e.g. 10:00 PM outdoor speaker curfew) with venue.",
        dueAt: addDaysToDate(eventDate, -14),
        offsetDaysFromEvent: -14,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        dependencies: [],
      },
      {
        title: "Final Guest Count Lock with Caterer",
        description: "Provide confirmed plate count to catering management to lock billing minimums.",
        dueAt: addDaysToDate(eventDate, -7),
        offsetDaysFromEvent: -7,
        status: "NOT_STARTED",
        priority: "CRITICAL",
        dependencies: [],
      },
    ],
    vendorTasks: [
      {
        category: "VENUE",
        title: "Confirm Hall Access Hours & Generator Power Backup",
        requirements: "Ensure seamless electricity for AC, stage lighting, and mandap ceremonies; verify generator diesel coverage.",
        status: "NOT_STARTED",
        estimatedCostCents: venueCost ?? 0,
        suggestedLeadTimeDays: 180,
      },
      {
        category: "CATERING",
        title: "Finalize Live Food Counters & Dietary Preferences",
        requirements: "Specify exact breakdown of Pure Veg / Jain / Non-Veg options, mineral water dispensers, and welcome drinks.",
        status: "NOT_STARTED",
        estimatedCostCents: cateringCost ?? 0,
        suggestedLeadTimeDays: 120,
      },
      {
        category: "DECOR_FLORAL",
        title: "Mandap Vastu & Stage Safety Review",
        requirements: "Confirm fire-safe setup for havan kund, stability of heavy floral arches, and stage carpeting.",
        status: "NOT_STARTED",
        estimatedCostCents: decorCost ?? 0,
        suggestedLeadTimeDays: 60,
      },
      {
        category: "ENTERTAINMENT",
        title: "Coordinate Baraat Route & DJ Sangeet Playlist",
        requirements: "Coordinate dhol entry timing, baraat procession route to venue gates, and playlist cues for couple entry.",
        status: "NOT_STARTED",
        estimatedCostCents: djCost ?? 0,
        suggestedLeadTimeDays: 30,
      },
      {
        category: "OFFICIANT",
        title: "Confirm Pandit Ji / Ceremony Officiant & Samagri List",
        requirements: "Finalize ceremony muhurat timings, list of puja samagri items, havan setup, and lagna patrika.",
        status: "NOT_STARTED",
        suggestedLeadTimeDays: 45,
      },
      {
        category: "PERMITS_LOGISTICS",
        title: "Police & Municipal Sound Permission Verification",
        requirements: "Verify venue's sound license and local police NOC for outdoor music/baraat processions.",
        status: "NOT_STARTED",
        suggestedLeadTimeDays: 20,
      },
    ],
    ideas: [
      {
        category: "THEME",
        title: "Royal Heritage Marwar Decor with Marigold & Brass",
        description: "Warm brass urlis with floating candles and marigold garlands, paired with warm ivory and deep plum drapery.",
        whyItFits: "Blends timeless celebration elegance with authentic Indian festive warmth.",
      },
      {
        category: "ACTIVITY",
        title: "Interactive Sangeet Flash Mob & Live Dhol Jugalbandi",
        description: "Surprise family dance choreography transitioning into high-energy live dhol performance on the dance floor.",
        whyItFits: "Maximizes guest engagement and creates memorable celebratory moments across generations.",
      },
      {
        category: "MENU",
        title: "Regional Live Food Stations & Artisan Mithai Bar",
        description: "Live chaat and kathi roll counters followed by warm jalebi-rabri and artisanal fusion desserts.",
        whyItFits: "Delights guests with fresh, made-to-order culinary experiences.",
      },
      {
        category: "LOGISTICS",
        title: "QR-Code Digital Itinerary & Welcome Hamper Tagging",
        description: "Personalized room keys with itinerary cards guiding outstation guests to Haldi, Sangeet, and Wedding venues.",
        whyItFits: "Ensures guests from out of town are seamlessly coordinated throughout multi-day ceremonies.",
      },
    ],
    assumptions: {
      budgetAssumptions: [
        `Deterministic Plan: Total allocated is ${formatCentsToCurrency(total, currency)} across ${guests} guests.`,
        "Catering estimates assume high-grade multi-course Indian menu with live counters.",
        "Quotes are indicative planning benchmarks; actual contracts require formal vendor quotations.",
      ],
      guestCountAssumptions: [
        `Base calculations assume ${guests} attendees with ~10% standard buffer on catering.`,
      ],
      locationSpecificUncertainties: [
        `Local sound restriction guidelines for ${req.location || "the venue"} must be verified with banquet management.`,
        "Traffic and parking permissions for baraat procession require confirmation with local traffic police.",
      ],
      itemsRequiringUserConfirmation: [
        "Select which ceremonies require separate decor and catering (Haldi, Mehendi, Sangeet).",
        "Confirm whether liquor license (P-10 permit) is needed if bar service is planned.",
      ],
      permissionsToVerify: [
        "Verify local municipal sound limit and 10 PM outdoor music regulations.",
        "Check fire safety compliance certificate for indoor havan kund / cold pyrotechnics.",
      ],
    },
  };
}
