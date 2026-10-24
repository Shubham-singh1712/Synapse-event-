/**
 * Domain Logic & Helpers for SynapseEvent Vendors & Bookings Workspace
 * Strict INR-safe financial calculations, pipeline mappings, and India-first categories.
 */

import type { VendorTaskEntity, VendorTaskStatus } from "./schemas";

export type HumanVendorStatus =
  | "To contact"
  | "Contacted"
  | "Quote received"
  | "Contract signed"
  | "Booked"
  | "Completed"
  | "Declined";

export type PipelineStageKey =
  | "TO_CONTACT"
  | "CONTACTED"
  | "QUOTE_RECEIVED"
  | "BOOKED"
  | "COMPLETED"
  | "DECLINED";

export interface PipelineStageInfo {
  key: PipelineStageKey;
  label: string;
  shortLabel: string;
  description: string;
  count: number;
  colorClass: string;
  borderClass: string;
  bgLightClass: string;
}

export interface VendorPipelineSummary {
  totalVendors: number;
  activeVendorsCount: number;
  toContactCount: number;
  contactedCount: number;
  quoteReceivedCount: number;
  bookedCount: number;
  completedCount: number;
  declinedCount: number;
  totalQuotedCents: number;
  totalBookedCents: number;
  pendingQuotesCount: number;
  stages: PipelineStageInfo[];
}

export interface CategoryQuoteComparison {
  category: string;
  vendors: VendorTaskEntity[];
  vendorCount: number;
  quotesCount: number;
  minQuoteCents: number | null;
  maxQuoteCents: number | null;
  quoteDiffCents: number | null;
  isComparable: boolean;
}

/**
 * Maps raw database VendorTaskStatus to human-friendly user label
 */
export function toHumanVendorStatus(status: VendorTaskStatus): HumanVendorStatus {
  switch (status) {
    case "NOT_STARTED":
      return "To contact";
    case "INQUIRY_SENT":
      return "Contacted";
    case "PROPOSAL_RECEIVED":
      return "Quote received";
    case "CONTRACT_SIGNED":
      return "Contract signed";
    case "DEPOSIT_PAID":
      return "Booked";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Declined";
    default:
      return "To contact";
  }
}

/**
 * Maps human-friendly vendor status back to valid VendorTaskStatus
 */
export function fromHumanVendorStatus(label: string): VendorTaskStatus {
  switch (label.toLowerCase().trim()) {
    case "to contact":
    case "to do":
    case "not started":
      return "NOT_STARTED";
    case "contacted":
    case "inquiry sent":
      return "INQUIRY_SENT";
    case "quote received":
    case "proposal received":
      return "PROPOSAL_RECEIVED";
    case "contract signed":
      return "CONTRACT_SIGNED";
    case "booked":
    case "deposit paid":
      return "DEPOSIT_PAID";
    case "completed":
    case "done":
      return "COMPLETED";
    case "declined":
    case "cancelled":
      return "CANCELLED";
    default:
      return "NOT_STARTED";
  }
}

/**
 * Maps a VendorTaskStatus to high-level pipeline stage
 */
export function getPipelineStage(status: VendorTaskStatus): PipelineStageKey {
  switch (status) {
    case "NOT_STARTED":
      return "TO_CONTACT";
    case "INQUIRY_SENT":
      return "CONTACTED";
    case "PROPOSAL_RECEIVED":
      return "QUOTE_RECEIVED";
    case "CONTRACT_SIGNED":
    case "DEPOSIT_PAID":
      return "BOOKED";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "DECLINED";
    default:
      return "TO_CONTACT";
  }
}

/**
 * Calculates a summary of the booking pipeline based strictly on real saved vendor records.
 * Ensures strict financial separation: Quoted totals != Booked commitments != Actual paid.
 */
export function calculateVendorPipelineSummary(
  vendorTasks: VendorTaskEntity[]
): VendorPipelineSummary {
  let toContactCount = 0;
  let contactedCount = 0;
  let quoteReceivedCount = 0;
  let bookedCount = 0;
  let completedCount = 0;
  let declinedCount = 0;
  let totalQuotedCents = 0;
  let totalBookedCents = 0;
  let pendingQuotesCount = 0;

  for (const v of vendorTasks) {
    if (v.status === "CANCELLED") {
      declinedCount++;
      continue;
    }

    // Active vendor
    const cost = v.estimatedCostCents ?? 0;
    if (cost > 0) {
      totalQuotedCents += cost;
    } else {
      pendingQuotesCount++;
    }

    switch (v.status) {
      case "NOT_STARTED":
        toContactCount++;
        break;
      case "INQUIRY_SENT":
        contactedCount++;
        break;
      case "PROPOSAL_RECEIVED":
        quoteReceivedCount++;
        break;
      case "CONTRACT_SIGNED":
      case "DEPOSIT_PAID":
        bookedCount++;
        totalBookedCents += cost;
        break;
      case "COMPLETED":
        completedCount++;
        totalBookedCents += cost;
        break;
    }
  }

  const activeVendorsCount = vendorTasks.length - declinedCount;

  const stages: PipelineStageInfo[] = [
    {
      key: "TO_CONTACT",
      label: "To contact",
      shortLabel: "To contact",
      description: "Vendors to reach out to for initial inquiry",
      count: toContactCount,
      colorClass: "text-neutral-700 dark:text-neutral-300",
      borderClass: "border-neutral-300 dark:border-neutral-700",
      bgLightClass: "bg-neutral-100 dark:bg-neutral-800/60",
    },
    {
      key: "CONTACTED",
      label: "Contacted",
      shortLabel: "Contacted",
      description: "Inquiry or WhatsApp message sent; waiting for response",
      count: contactedCount,
      colorClass: "text-amber-700 dark:text-amber-400",
      borderClass: "border-amber-400/50 dark:border-amber-600/40",
      bgLightClass: "bg-amber-500/10",
    },
    {
      key: "QUOTE_RECEIVED",
      label: "Quote received",
      shortLabel: "Quoted",
      description: "Estimate received; reviewing pricing and inclusions",
      count: quoteReceivedCount,
      colorClass: "text-sky-700 dark:text-sky-400",
      borderClass: "border-sky-400/50 dark:border-sky-600/40",
      bgLightClass: "bg-sky-500/10",
    },
    {
      key: "BOOKED",
      label: "Booked",
      shortLabel: "Booked",
      description: "Agreement finalized or advance deposit paid",
      count: bookedCount,
      colorClass: "text-purple-700 dark:text-purple-300",
      borderClass: "border-purple-400/50 dark:border-purple-600/40",
      bgLightClass: "bg-purple-500/10",
    },
    {
      key: "COMPLETED",
      label: "Completed",
      shortLabel: "Done",
      description: "Service delivered and celebration work finished",
      count: completedCount,
      colorClass: "text-emerald-700 dark:text-emerald-400",
      borderClass: "border-emerald-400/50 dark:border-emerald-600/40",
      bgLightClass: "bg-emerald-500/10",
    },
  ];

  return {
    totalVendors: vendorTasks.length,
    activeVendorsCount,
    toContactCount,
    contactedCount,
    quoteReceivedCount,
    bookedCount,
    completedCount,
    declinedCount,
    totalQuotedCents,
    totalBookedCents,
    pendingQuotesCount,
    stages,
  };
}

/**
 * Groups vendors by category for side-by-side quote comparison.
 * Enables Indian families to compare e.g. 2 caterers, 2 venues, or 2 photographers easily.
 */
export function groupQuotesForComparison(
  vendorTasks: VendorTaskEntity[]
): CategoryQuoteComparison[] {
  const map = new Map<string, VendorTaskEntity[]>();

  for (const v of vendorTasks) {
    if (v.status === "CANCELLED") continue; // Exclude declined vendors from comparison by default
    const normalizedCategory = v.category.trim() || "General";
    const list = map.get(normalizedCategory) || [];
    list.push(v);
    map.set(normalizedCategory, list);
  }

  const comparisons: CategoryQuoteComparison[] = [];

  for (const [category, vendors] of map.entries()) {
    const quotes = vendors
      .map((v) => v.estimatedCostCents)
      .filter((cost): cost is number => typeof cost === "number" && cost > 0);

    const minQuoteCents = quotes.length > 0 ? Math.min(...quotes) : null;
    const maxQuoteCents = quotes.length > 0 ? Math.max(...quotes) : null;
    const quoteDiffCents =
      quotes.length >= 2 && minQuoteCents !== null && maxQuoteCents !== null
        ? maxQuoteCents - minQuoteCents
        : null;

    comparisons.push({
      category,
      vendors,
      vendorCount: vendors.length,
      quotesCount: quotes.length,
      minQuoteCents,
      maxQuoteCents,
      quoteDiffCents,
      isComparable: vendors.length >= 2,
    });
  }

  // Sort: categories with multiple vendors first, then alphabetically
  return comparisons.sort((a, b) => {
    if (a.isComparable && !b.isComparable) return -1;
    if (!a.isComparable && b.isComparable) return 1;
    return a.category.localeCompare(b.category);
  });
}

/**
 * Standard India-First Celebration Categories
 */
export const INDIA_VENDOR_CATEGORIES = [
  "Venue & Location",
  "Catering & Sweets",
  "Decor & Flowers",
  "Cake & Desserts",
  "Photography & Videography",
  "Makeup & Styling",
  "Clothing & Jewellery",
  "Music & Entertainment",
  "Transport & Cabs",
  "Accommodation",
  "Gifts & Favors",
  "Priest & Rituals",
  "Other Services",
] as const;

export interface SuggestedVendor {
  title: string;
  category: string;
  requirements: string;
  estimatedCostPaise?: number; // Sample ballpark in paise
}

/**
 * Contextual Indian Celebration Vendor Suggestions by Archetype
 */
export const ARCHETYPE_VENDOR_SUGGESTIONS: Record<string, SuggestedVendor[]> = {
  WEDDING: [
    {
      title: "Caterer / Halwai Team",
      category: "Catering & Sweets",
      requirements:
        "Multi-cuisine buffet with live chaat, jalebi-rabdi counter, and separate Jain counter. Ask for food tasting session.",
    },
    {
      title: "Mandap & Floral Decorator",
      category: "Decor & Flowers",
      requirements:
        "Fresh marigold & jasmine entrance arch, stage mandap backdrop, warm fairy lighting, and floral centerpieces.",
    },
    {
      title: "Wedding Candid Photographer & Cinematographer",
      category: "Photography & Videography",
      requirements:
        "Full coverage for Sangeet, Wedding, and Reception. Include candid portraits, cinematic teaser reel, and raw album files.",
    },
    {
      title: "Bridal Makeup & Mehendi Artist",
      category: "Makeup & Styling",
      requirements:
        "HD/Airbrush bridal makeup for 2 events with draping and hair styling. Arabic & traditional bridal henna for hands and feet.",
    },
    {
      title: "DJ, Sound System & Live Dholak",
      category: "Music & Entertainment",
      requirements:
        "JBL sound system, wireless mics, moving head lights, and 2 live Punjabi/Nasik dhol players for the Baraat procession.",
    },
    {
      title: "Pandit ji & Vedic Ritual Samagri",
      category: "Priest & Rituals",
      requirements:
        "Vedic marriage ceremony solemnization, hawan samagri, holy gangajal, and consultation on auspicious muhurat timings.",
    },
    {
      title: "Guest Travel & Railway Pickup Cabs",
      category: "Transport & Cabs",
      requirements:
        "2 Innova/tempo travelers on standby for outstation guest airport and station arrivals and mandap shuttles.",
    },
  ],
  BIRTHDAY: [
    {
      title: "Custom Themed Birthday Cake Baker",
      category: "Cake & Desserts",
      requirements:
        "2-tier eggless designer cake with custom fondant theme, sparkler candles, and scheduled chilled delivery 1 hour prior.",
    },
    {
      title: "Balloon Arch & Backdrop Decorator",
      category: "Decor & Flowers",
      requirements:
        "Organic pastel balloon garland, LED neon 'Happy Birthday' sign, and themed welcome easel board.",
    },
    {
      title: "Party Catering & Live Snack Counter",
      category: "Catering & Sweets",
      requirements:
        "Fresh live pizza / pasta counter, pav bhaji, mocktail bar, and chocolate fountain for children and families.",
    },
    {
      title: "Celebration Photographer",
      category: "Photography & Videography",
      requirements:
        "2-hour portrait and candid coverage of guests, games, and cake cutting ceremony with edited digital gallery.",
    },
    {
      title: "Party Host & Kids Entertainment",
      category: "Music & Entertainment",
      requirements:
        "Interactive game host / magician, background music setup, and balloon twisting artist for visiting kids.",
    },
    {
      title: "Return Gift Hampers Specialist",
      category: "Gifts & Favors",
      requirements:
        "Curated customized return gift boxes with stationery / board game and personalized thank-you tags.",
    },
  ],
  COMMUNITY: [
    {
      title: "Sound System & PA Operator (10 PM Compliant)",
      category: "Music & Entertainment",
      requirements:
        "Collar and podium microphones, 4 distributed speakers, and volume control adhering strictly to local ward guidelines.",
    },
    {
      title: "Silent Diesel Generator Backup (15kVA)",
      category: "Other Services",
      requirements:
        "Uninterrupted silent power backup for festival lighting, sound amplifiers, and emergency exits.",
    },
    {
      title: "Community Kitchen & Prasad / Langar Caterer",
      category: "Catering & Sweets",
      requirements:
        "Wholesome vegetarian prasad preparation, eco-friendly sal leaf plates (patravali), and clean drinking water dispensers.",
    },
    {
      title: "Biodegradable Shamiana & Seating Provider",
      category: "Decor & Flowers",
      requirements:
        "Waterproof fabric canopy tent, 150 cushioned banquet chairs, carpet runners, and pedestal fans.",
    },
    {
      title: "Swachhata & Waste Management Partner",
      category: "Other Services",
      requirements:
        "Segregated wet/dry waste dustbins, continuous venue sweeping, and tie-up with municipal morning compost pickup.",
    },
  ],
};
