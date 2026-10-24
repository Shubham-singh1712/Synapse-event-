import type { GenerateEventPlanRequest, AiGeneratedPlanResponse } from "@/lib/domain/ai-contracts";
import { allocateCentsByPercentages, formatCentsToCurrency } from "@/lib/domain/money";
import { addDaysToDate } from "@/lib/domain/timeline";

export const BIRTHDAY_SYSTEM_PROMPT = `You are SynapseEvent's India-first birthday celebration planning intelligence engine.
Your task is to generate a lively, memorable, culturally resonant, and budget-conscious Indian birthday celebration plan.

CRITICAL INSTRUCTIONS:
1. Adhere strictly to the requested JSON schema.
2. The user has set an exact total budget in integer minor units (paise for INR or cents for USD) and an estimated guest count.
3. Every budget item MUST have a non-negative estimatedCostCents (in paise/minor units).
4. Food/beverage and cake items should be marked isGuestSensitive = true. Fixed items (DJ/emcee/decor) are false.
5. All dates for milestones must be YYYY-MM-DD calculated relative to the event date.
6. Support Indian birthday celebration preferences (e.g. eggless cakes, live chaat/starter counters, return gifts/favours, games/magic show/emcee).
7. Clearly state that estimates are planning benchmarks and require formal vendor quotes.
8. Output ONLY valid JSON conforming to the schema. No conversational preamble.`;

export function generateBirthdayFallbackPlan(
  req: GenerateEventPlanRequest
): AiGeneratedPlanResponse {
  const total = req.totalBudgetCents;
  const guests = Math.max(1, req.guestCount);
  const eventDate = req.eventDate;
  const currency = req.currency || "INR";

  // Allocation benchmark:
  // Venue/Banquet (22%), Food & Cake (38%), Theme Decor & Balloon Styling (14%),
  // Emcee/Games/Entertainment (12%), Photography (8%), Return Gifts & Buffer (6%)
  const shares = [22, 38, 14, 12, 8, 6];
  const [venueCost, foodCost, decorCost, entertainmentCost, photoCost, bufferCost] =
    allocateCentsByPercentages(total, shares);

  const perGuestFood = Math.round((foodCost ?? 0) / guests);

  return {
    budgetItems: [
      {
        category: "VENUE",
        description: `Party Hall / Cafe / Club House Space (${req.location || "Local Banquet"})`,
        estimatedCostCents: venueCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Includes private hall booking for 4-5 hours with basic seating, air-conditioning and sound hookups.",
      },
      {
        category: "CATERING",
        description: `Catered Buffet, Live Starters & Designer Cake (${guests} guests)`,
        estimatedCostCents: foodCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: true,
        estimatedUnitCostCents: perGuestFood,
        assumptions: `Estimated at ~${formatCentsToCurrency(perGuestFood, currency)} per guest covering welcome mocktails, live chaat/finger food, main buffet, and custom themed cake (eggless available).`,
      },
      {
        category: "DECOR_FLORAL",
        description: "Themed Balloon Arch, Backdrop, LED Age Numbers & Table Styling",
        estimatedCostCents: decorCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Custom theme styling with organic balloon garlands, photo-op backdrop, and welcome easel board.",
      },
      {
        category: "ENTERTAINMENT",
        description: "Engaging Emcee Host, Party Games, Magic Show / Music Playlist",
        estimatedCostCents: entertainmentCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "2.5 hours of coordinated party games, music coordination, and interactive activities for all ages.",
      },
      {
        category: "PHOTOGRAPHY_VIDEO",
        description: "Event Candid Photography & Family Portrait Coverage",
        estimatedCostCents: photoCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Professional photographer capturing guest arrivals, cake cutting ceremony, and candid moments.",
      },
      {
        category: "BUFFER_CONTINGENCY",
        description: "Return Gifts / Party Favours & Reserve Buffer",
        estimatedCostCents: bufferCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Curated return gifts for attendees and emergency buffer for additional snack orders.",
      },
    ],
    milestones: [
      {
        title: "Lock In Theme & Reserve Venue Space",
        description: "Confirm hall or banquet reservation and establish celebration theme.",
        dueAt: addDaysToDate(eventDate, -30),
        offsetDaysFromEvent: -30,
        status: "NOT_STARTED",
        priority: "CRITICAL",
        dependencies: [],
      },
      {
        title: "Send WhatsApp & Digital Invitations",
        description: "Share designed invitation cards with location map and RSVP deadline.",
        dueAt: addDaysToDate(eventDate, -21),
        offsetDaysFromEvent: -21,
        status: "NOT_STARTED",
        priority: "HIGH",
        dependencies: ["Lock In Theme & Reserve Venue Space"],
      },
      {
        title: "Order Custom Designer Birthday Cake with Bakery",
        description: "Select flavor (chocolate truffle, red velvet, butterscotch), design reference, and weight.",
        dueAt: addDaysToDate(eventDate, -14),
        offsetDaysFromEvent: -14,
        status: "NOT_STARTED",
        priority: "HIGH",
        dependencies: [],
      },
      {
        title: "Book Emcee / Entertainer & Decorator",
        description: "Finalize party games list, music playlist, and backdrop styling specs.",
        dueAt: addDaysToDate(eventDate, -10),
        offsetDaysFromEvent: -10,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        dependencies: [],
      },
      {
        title: "Purchase Curated Return Gifts",
        description: "Assemble personalized return gift hampers or favors based on confirmed RSVP count.",
        dueAt: addDaysToDate(eventDate, -5),
        offsetDaysFromEvent: -5,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        dependencies: [],
      },
      {
        title: "Final RSVP Head Count Lock with Caterer",
        description: "Confirm final plate count with catering team.",
        dueAt: addDaysToDate(eventDate, -2),
        offsetDaysFromEvent: -2,
        status: "NOT_STARTED",
        priority: "CRITICAL",
        dependencies: [],
      },
    ],
    vendorTasks: [
      {
        category: "VENUE",
        title: "Review Venue Sound & External Food Rules",
        requirements: "Confirm outside cake bringing permissions, music cutoff timings, and decorator setup time windows.",
        status: "NOT_STARTED",
        estimatedCostCents: venueCost ?? 0,
        suggestedLeadTimeDays: 30,
      },
      {
        category: "CATERING",
        title: "Finalize Starters, Cake Delivery & Food Service",
        requirements: "Ensure cold storage for the cake upon arrival; schedule starter rounds before cake cutting.",
        status: "NOT_STARTED",
        estimatedCostCents: foodCost ?? 0,
        suggestedLeadTimeDays: 14,
      },
      {
        category: "DECOR_FLORAL",
        title: "Verify Theme Styling Color Palette & Name Backdrop",
        requirements: "Confirm balloon colors match theme (e.g. pastel aesthetic or metallic tones) and name board spelling.",
        status: "NOT_STARTED",
        estimatedCostCents: decorCost ?? 0,
        suggestedLeadTimeDays: 10,
      },
    ],
    ideas: [
      {
        category: "THEME",
        title: "Bollywood Retro Glam or Pastel Carnival",
        description: "Vibrant photo booth with props, polarized sunglasses for guests, and custom vinyl welcome board.",
        whyItFits: "Energetic and universally loved across family and friends.",
      },
      {
        category: "MENU",
        title: "Live Pasta & Street Chaat Counter with Dessert Shot Glasses",
        description: "Interactive hot food counters paired with mini gulab jamun and mousse dessert cups.",
        whyItFits: "Keeps guests circulating and enjoying fresh snacks throughout the party.",
      },
      {
        category: "ACTIVITY",
        title: "Instant Polaroid Guestbook & Memory Wall",
        description: "Guests snap polaroids at the entrance, write heartfelt notes, and peg them to a fairy-lit twine board.",
        whyItFits: "Creates a tangible, personal keepsake for the birthday celebrant.",
      },
    ],
    assumptions: {
      budgetAssumptions: [
        `Deterministic Plan: Total allocated is ${formatCentsToCurrency(total, currency)} across ${guests} guests.`,
        "Catering estimates include snacks, buffet, beverages, and custom designer cake.",
        "Figures are planning benchmarks and require formal quotation confirmation.",
      ],
      guestCountAssumptions: [
        `Base calculation assumes ${guests} attendees with ~10% standard buffer.`,
      ],
      locationSpecificUncertainties: [
        `Check venue policy on confetti cannons or cold pyro at ${req.location || "the venue"}.`,
      ],
      itemsRequiringUserConfirmation: [
        "Confirm dietary breakdown (veg vs non-veg options and eggless cake preference).",
        "Confirm whether outside decorators are allowed or if in-house decorator is mandatory.",
      ],
      permissionsToVerify: [
        "Check commercial music playing license compliance if hosting in a public commercial hall.",
      ],
    },
  };
}
