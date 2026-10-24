import type { GenerateEventPlanRequest, AiGeneratedPlanResponse } from "@/lib/domain/ai-contracts";
import { allocateCentsByPercentages, formatCentsToCurrency } from "@/lib/domain/money";
import { addDaysToDate } from "@/lib/domain/timeline";

export const COMMUNITY_SYSTEM_PROMPT = `You are SynapseEvent's India-first community celebration and event planning intelligence engine.
Your task is to organize an inclusive, legally compliant, well-coordinated, and impactful Indian community event (festival celebration, college fest, RWA cultural night, or charity gathering).

CRITICAL INSTRUCTIONS:
1. Adhere strictly to the requested JSON schema.
2. The user has set an exact total budget in integer minor units (paise for INR or cents for USD) and an estimated attendee count.
3. Every budget item MUST have a non-negative estimatedCostCents (in paise/minor units).
4. Emphasize that municipal permissions, police NOC, sound permissions (10 PM loudspeaker regulations), and fire safety clearances require direct verification with local authorities (suggestions are planning checklists, not legal clearance).
5. Include volunteer coordination, zero-waste sanitation management, stage/sound/AV setup, and emergency medical protocols.
6. Clearly state that estimates are planning benchmarks. Do NOT invent verified vendor rates.
7. Output ONLY valid JSON conforming to the schema. No conversational preamble.`;

export function generateCommunityFallbackPlan(
  req: GenerateEventPlanRequest
): AiGeneratedPlanResponse {
  const total = req.totalBudgetCents;
  const guests = Math.max(1, req.guestCount);
  const eventDate = req.eventDate;
  const currency = req.currency || "INR";

  // Allocation benchmark:
  // Ground/Auditorium Venue (24%), Stage, Truss & Sound AV (26%), Refreshments/Community Kitchen (20%),
  // Permits, Sanitation & Waste Mgmt (14%), Signage & Digital Outreach (8%), Safety Buffer (8%)
  const shares = [24, 26, 20, 14, 8, 8];
  const [venueCost, stageCost, foodCost, permitsCost, marketingCost, bufferCost] =
    allocateCentsByPercentages(total, shares);

  return {
    budgetItems: [
      {
        category: "VENUE",
        description: `Community Ground / Institutional Auditorium Booking (${req.location || "Public Venue"})`,
        estimatedCostCents: venueCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Municipal / Society booking fee, parking space access, and security deposit.",
      },
      {
        category: "ENTERTAINMENT",
        description: "Stage, Heavy-Duty Truss, Public Address (PA) Audio & Silent Generator Backup",
        estimatedCostCents: stageCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "High-wattage acoustic sound system, cordless mics, stage lighting, and silent DG generator set.",
      },
      {
        category: "CATERING",
        description: `Volunteer Catering, Hydration Booths & Light Refreshments (${guests} est. attendees)`,
        estimatedCostCents: foodCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: true,
        assumptions: "Packaged drinking water dispensers, tea/coffee stalls, and volunteer crew meal boxes.",
      },
      {
        category: "PERMITS_LOGISTICS",
        description: "Municipal Permissions, Eco-Friendly Waste Segregation & Sanitation Crew",
        estimatedCostCents: permitsCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Police NOC filing assistance, mobile accessible toilets, and Swachh Bharat green waste sorting bins.",
      },
      {
        category: "MARKETING_INVITES",
        description: "Event Directional Banners, Entry Arches, Badges & Digital Outreach",
        estimatedCostCents: marketingCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Wayfinding flex-boards, volunteer lanyards, stage backdrop banner, and digital flyer assets.",
      },
      {
        category: "BUFFER_CONTINGENCY",
        description: "Public Safety, First Aid Desk & Weather Contingency Reserve",
        estimatedCostCents: bufferCost ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        isGuestSensitive: false,
        assumptions: "Emergency standby reserves for waterproof canopies, on-site first aid kit, and volunteer transport.",
      },
    ],
    milestones: [
      {
        title: "File Police NOC & Local Municipal Ground Requisition",
        description: "Submit event plan to local police station and municipal corporation for venue allotment and security NOC.",
        dueAt: addDaysToDate(eventDate, -60),
        offsetDaysFromEvent: -60,
        status: "NOT_STARTED",
        priority: "CRITICAL",
        dependencies: [],
      },
      {
        title: "Obtain Loudspeaker & Sound Permission",
        description: "Secure local SDM / ACP sound permission adhering to the 10:00 PM decibel cutoff limits.",
        dueAt: addDaysToDate(eventDate, -30),
        offsetDaysFromEvent: -30,
        status: "NOT_STARTED",
        priority: "HIGH",
        dependencies: ["File Police NOC & Local Municipal Ground Requisition"],
      },
      {
        title: "Contract Stage, Audio/Visual & Generator Vendor",
        description: "Finalize stage dimensions, barricading for crowd control, and backup generator capacity.",
        dueAt: addDaysToDate(eventDate, -20),
        offsetDaysFromEvent: -20,
        status: "NOT_STARTED",
        priority: "HIGH",
        dependencies: [],
      },
      {
        title: "Volunteer Orientation & Safety Briefing",
        description: "Assign volunteer leads for registration, crowd flow, water stations, and first-aid response.",
        dueAt: addDaysToDate(eventDate, -7),
        offsetDaysFromEvent: -7,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        dependencies: [],
      },
      {
        title: "On-Site Layout & Waste Management Setup",
        description: "Install separate dry and wet waste bins, setup drinking water dispensers, and test sound levels.",
        dueAt: addDaysToDate(eventDate, -1),
        offsetDaysFromEvent: -1,
        status: "NOT_STARTED",
        priority: "CRITICAL",
        dependencies: [],
      },
    ],
    vendorTasks: [
      {
        category: "PERMITS_LOGISTICS",
        title: "Verify Police NOC & Municipal Permit Letters",
        requirements: "Keep physical printed copies of police clearance and sound permission at the event control desk.",
        status: "NOT_STARTED",
        estimatedCostCents: permitsCost ?? 0,
        suggestedLeadTimeDays: 45,
      },
      {
        category: "ENTERTAINMENT",
        title: "Stage Stability & Generator Load Testing",
        requirements: "Ensure heavy iron stage structure is certified safe and generator is fueled for 8 continuous hours.",
        status: "NOT_STARTED",
        estimatedCostCents: stageCost ?? 0,
        suggestedLeadTimeDays: 20,
      },
      {
        category: "PERMITS_LOGISTICS",
        title: "Green Event Zero-Waste Sanitation Protocol",
        requirements: "Coordinate with municipal waste collectors for post-event segregated disposal; strictly avoid single-use plastic.",
        status: "NOT_STARTED",
        suggestedLeadTimeDays: 15,
      },
    ],
    ideas: [
      {
        category: "THEME",
        title: "Eco-Friendly Utsav with Jute Banners & Clay Diyas / Lanterns",
        description: "Plastic-free sustainable celebration featuring handmade terracotta decor, seed-paper invites, and cloth banners.",
        whyItFits: "Promotes responsible community stewardship while celebrating Indian cultural heritage.",
      },
      {
        category: "ACTIVITY",
        title: "Inter-Community Cultural Showcase & Talent Stage",
        description: "Curated slots for local youth dance troupes, classical music performances, and community elder felicitations.",
        whyItFits: "Encourages broad community participation across all age groups and neighborhoods.",
      },
      {
        category: "MENU",
        title: "Community Langar / Prasad Feast with Local Delicacies",
        description: "Wholesome, freshly prepared traditional community meal served on biodegradable leaf plates (pattals).",
        whyItFits: "Builds deep community bonding and honors authentic Indian hospitality traditions.",
      },
    ],
    assumptions: {
      budgetAssumptions: [
        `Deterministic Plan: Total allocated is ${formatCentsToCurrency(total, currency)} for ~${guests} expected participants.`,
        "Permit fee estimates are indicative planning figures; statutory fees vary by city and municipal jurisdiction.",
        "Figures are planning benchmarks and require formal quotation confirmation.",
      ],
      guestCountAssumptions: [
        `Logistics planned for ${guests} attendees with designated entry and emergency exit corridors.`,
      ],
      locationSpecificUncertainties: [
        `Local municipal norms and Municipal permit approval timelines for ${req.location || "the venue"} must be verified with the relevant ward office.`,
        "Parking and traffic congestion control require coordination with traffic police.",
      ],
      itemsRequiringUserConfirmation: [
        "Confirm whether entry is ticketed or free for all community members.",
        "Confirm generator capacity required for external food stalls if stalls are permitted.",
      ],
      permissionsToVerify: [
        "Local police NOC and sound permission certificate for outdoor speaker usage.",
        "Fire department NOC if setting up large fabric tents or temporary structures.",
        "Municipal corporation permission for ground usage and waste disposal.",
      ],
    },
  };
}
