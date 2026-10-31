import type { CompleteEventPlan } from "@/lib/services/event-service";
import { formatCentsToCurrency } from "@/lib/domain/money";
import { formatIndianDate } from "@/lib/domain/i18n";
import {
  type CopilotChatRequest,
  type CopilotChatResponse,
  type CopilotProposedAction,
} from "@/lib/domain/copilot-contracts";
import { DEFAULT_GEMINI_MODEL, AI_REQUEST_TIMEOUT_MS } from "./adapter";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { calculateTimelineSummary } from "@/lib/domain/timeline";

export type CopilotIntent =
  | "NEW_ACTIVITY_BUDGET"
  | "FOLLOW_UP_REFINEMENT"
  | "GUEST_COUNT_CHANGE"
  | "TIMELINE_SCHEDULE"
  | "VENDOR_RECOMMENDATION"
  | "FAMILY_COORDINATION"
  | "INTIMATE_GATHERING"
  | "BUDGET_OVERVIEW"
  | "GENERAL_ASSISTANCE";

/**
 * Strips raw markdown syntax characters (# hashtags, * asterisks, > blockquotes)
 * so that user-facing responses are clean, elegant, and symbol-free.
 */
export function stripMarkdownSymbols(text: string): string {
  if (!text) return "";
  return text
    // Remove markdown heading hashtags (e.g. ###, ##, #) at start of lines
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, "")
    // Remove bold and italic asterisks: **text** -> text, *text* -> text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Remove any remaining stray asterisks
    .replace(/(^|\s)\*{1,2}(\s|$)/g, "$1$2")
    // Remove any remaining stray hashtags
    .replace(/(^|\s)#{1,6}(\s|$)/g, "$1$2")
    // Remove blockquote characters: > Text -> Text
    .replace(/^[ \t]*>[ \t]*/gm, "")
    .trim();
}

/**
 * Classifies user intent from current message and conversation history.
 */
export function classifyCopilotIntent(
  message: string,
  history?: Array<{ role: string; content: string }>
): {
  intent: CopilotIntent;
  activityTopic?: string;
  extractedCount?: number;
} {
  const q = message.toLowerCase().trim();

  // 1. Check for follow-up refinement if previous assistant message asked about kids / activity details
  if (history && history.length > 0) {
    const lastAssistantMsg = [...history].reverse().find((h) => h.role === "assistant")?.content.toLowerCase() || "";
    const isFollowUpToActivity =
      lastAssistantMsg.includes("how many children") ||
      lastAssistantMsg.includes("how many kids") ||
      lastAssistantMsg.includes("dance competition") ||
      lastAssistantMsg.includes("participate") ||
      lastAssistantMsg.includes("sound system");

    if (isFollowUpToActivity) {
      const countMatch = q.match(/\b(\d+)\s*(kids|children|guests|people)?\b/);
      if (countMatch) {
        return {
          intent: "FOLLOW_UP_REFINEMENT",
          extractedCount: parseInt(countMatch[1], 10),
        };
      }
      if (q.includes("venue") || q.includes("speaker") || q.includes("diy") || q.includes("family")) {
        return {
          intent: "FOLLOW_UP_REFINEMENT",
          extractedCount: 10,
        };
      }
    }
  }

  // 2. New Activity or Entertainment with Budget / Cost inquiry
  const hasActivityKeyword =
    q.includes("dance") ||
    q.includes("competition") ||
    q.includes("games") ||
    q.includes("magic show") ||
    q.includes("photo booth") ||
    q.includes("photobooth") ||
    q.includes("entertainer") ||
    q.includes("anchor") ||
    q.includes("emcee") ||
    q.includes("tattoo") ||
    q.includes("puppet") ||
    q.includes("karaoke") ||
    q.includes("return gifts stall");

  const hasCostOrIncreaseKeyword =
    q.includes("how much") ||
    q.includes("increase") ||
    q.includes("budget") ||
    q.includes("cost") ||
    q.includes("extra") ||
    q.includes("add") ||
    q.includes("spend") ||
    q.includes("afford");

  if (hasActivityKeyword && hasCostOrIncreaseKeyword) {
    return {
      intent: "NEW_ACTIVITY_BUDGET",
      activityTopic: "kids dance competition",
    };
  }

  // 3. Guest count scaling
  if (
    q.includes("more people") ||
    q.includes("more guests") ||
    q.includes("extra guests") ||
    q.includes("5 more") ||
    q.includes("10 more") ||
    q.includes("guests attend") ||
    q.includes("increase guests")
  ) {
    const countMatch = q.match(/\b(\d+)\s*more\b/) || q.match(/\bif\s*(\d+)\b/);
    return {
      intent: "GUEST_COUNT_CHANGE",
      extractedCount: countMatch ? parseInt(countMatch[1], 10) : 10,
    };
  }

  // 4. Timeline / Schedule / 7 Days
  if (
    q.includes("seven days") ||
    q.includes("7 days") ||
    q.includes("next week") ||
    q.includes("next days") ||
    q.includes("schedule") ||
    q.includes("timeline") ||
    q.includes("plan my week")
  ) {
    return { intent: "TIMELINE_SCHEDULE" };
  }

  // 5. Vendor sequence / booking recommendations
  if (
    q.includes("book first") ||
    q.includes("priority") ||
    q.includes("where to start") ||
    q.includes("first step") ||
    q.includes("vendor quote")
  ) {
    return { intent: "VENDOR_RECOMMENDATION" };
  }

  // 6. Family coordination / elders / whatsapp
  if (
    q.includes("family") ||
    q.includes("checklist") ||
    q.includes("coordinating") ||
    q.includes("elder") ||
    q.includes("whatsapp")
  ) {
    return { intent: "FAMILY_COORDINATION" };
  }

  // 7. Intimate gathering
  if (q.includes("25") || q.includes("intimate") || q.includes("small gathering")) {
    return { intent: "INTIMATE_GATHERING" };
  }

  // 8. General Budget overview
  if (
    q.includes("budget") ||
    q.includes("cost") ||
    q.includes("money") ||
    q.includes("expensive") ||
    q.includes("save") ||
    q.includes("ledger")
  ) {
    return { intent: "BUDGET_OVERVIEW" };
  }

  return { intent: "GENERAL_ASSISTANCE" };
}

/**
 * Builds a sanitized, question-aware event context summary.
 * Strips personal emails, tokens, and unrelated records.
 * Retrieves only the context necessary for the detected intent.
 */
export function buildEventGroundingContext(
  plan: CompleteEventPlan,
  intent: CopilotIntent = "GENERAL_ASSISTANCE"
): {
  summaryString: string;
} {
  const event = plan.event;
  const budgetItems = plan.budgetItems || [];
  const milestones = plan.milestones || [];
  const budgetSummary =
    plan.budgetSummary || calculateBudgetSummary(event.totalBudgetCents, event.guestCount, budgetItems);
  const timelineSummary =
    plan.timelineSummary || calculateTimelineSummary(event.eventDate, milestones);

  // Focused context for New Activity inquiries
  if (intent === "NEW_ACTIVITY_BUDGET" || intent === "FOLLOW_UP_REFINEMENT") {
    const entertainmentItems = budgetItems.filter(
      (b) =>
        b.category.toLowerCase().includes("entertainment") ||
        b.category.toLowerCase().includes("theme") ||
        b.category.toLowerCase().includes("decor")
    );

    const summaryString = `
EVENT SUMMARY:
- Title: ${event.title}
- Archetype: ${event.archetype}
- Guest Count: ${event.guestCount}
- Location: ${event.location || "Venue TBD"}
- Total Budget: ${formatCentsToCurrency(event.totalBudgetCents, event.currency)}
- Allocated Budget: ${formatCentsToCurrency(budgetSummary.totalEstimatedCostCents, event.currency)} (${budgetSummary.allocationPercent}% allocated)
- Unallocated Reserve Buffer: ${formatCentsToCurrency(budgetSummary.unallocatedBudgetCents, event.currency)}

EXISTING RELEVANT ACTIVITIES / ENTERTAINMENT ITEMS:
${
  entertainmentItems.length > 0
    ? entertainmentItems.map((e) => `• ${e.description} (${formatCentsToCurrency(e.estimatedCostCents, event.currency)})`).join("\n")
    : "• No dedicated entertainment line items currently recorded."
}
`.trim();

    return { summaryString };
  }

  // Focused context for Timeline inquiries
  if (intent === "TIMELINE_SCHEDULE") {
    const pendingMilestones = milestones
      .filter((m) => m.status !== "COMPLETED")
      .slice(0, 5)
      .map((m) => `• [${m.priority}] ${m.title} (Due: ${m.dueAt})`);

    const summaryString = `
EVENT TIMELINE:
- Title: ${event.title}
- Event Date: ${event.eventDate} (${timelineSummary.daysUntilEvent} days remaining)
- Milestones Completed: ${timelineSummary.completedMilestones}/${timelineSummary.totalMilestones}
- Upcoming Pending Milestones:
${pendingMilestones.join("\n")}
`.trim();

    return { summaryString };
  }

  // Standard balanced summary for general inquiries
  const topCategories = budgetItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.estimatedCostCents;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(topCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, cents]) => `${cat}: ${formatCentsToCurrency(cents, event.currency)}`);

  const pendingMilestones = milestones
    .filter((m) => m.status !== "COMPLETED")
    .slice(0, 4)
    .map((m) => `• [${m.priority}] ${m.title} (Due: ${m.dueAt})`);

  const summaryString = `
EVENT SPECIFICATION:
- Title: ${event.title}
- Archetype: ${event.archetype}
- Event Date: ${event.eventDate} (${timelineSummary.daysUntilEvent} days remaining)
- Location: ${event.location || "Location TBD"}
- Guest Count: ${event.guestCount} Attendees
- Total Budget: ${formatCentsToCurrency(event.totalBudgetCents, event.currency)}
- Allocated Budget: ${formatCentsToCurrency(budgetSummary.totalEstimatedCostCents, event.currency)} (${budgetSummary.allocationPercent}% allocated)
- Available Buffer: ${formatCentsToCurrency(budgetSummary.unallocatedBudgetCents, event.currency)}
- Top Categories: ${sortedCategories.join("; ")}
- Pending Milestones:
${pendingMilestones.join("\n")}
`.trim();

  return { summaryString };
}

/**
 * Deterministic celebration advisory engine.
 * Directly answers the user's specific question in clean, natural language without hashtags (#) or asterisks (*).
 */
export function generateDeterministicCopilotAdvice(
  plan: CompleteEventPlan,
  request: CopilotChatRequest
): CopilotChatResponse {
  const startTime = Date.now();
  const event = plan.event;
  const budgetItems = plan.budgetItems || [];
  const milestones = plan.milestones || [];
  const budgetSummary =
    plan.budgetSummary || calculateBudgetSummary(event.totalBudgetCents, event.guestCount, budgetItems);
  const timelineSummary =
    plan.timelineSummary || calculateTimelineSummary(event.eventDate, milestones);
  const currency = event.currency || "INR";
  const { intent, extractedCount } = classifyCopilotIntent(request.message, request.history);

  let reply = "";
  const suggestedActions: CopilotProposedAction[] = [];
  let followUpPrompts: string[] = [];

  // 1. New Activity Budget Inquiry (e.g. Kids Dance Competition)
  if (intent === "NEW_ACTIVITY_BUDGET") {
    const isBudgetFull = budgetSummary.unallocatedBudgetCents <= 0;
    const estMin = 1200;
    const estMax = 3500;
    const estMinCents = estMin * 100;
    const estMaxCents = estMax * 100;

    reply = `To host a small children's dance competition for ${event.title}, you should expect an estimated incremental addition of ${formatCentsToCurrency(estMinCents, currency)} to ${formatCentsToCurrency(estMaxCents, currency)}, depending on whether you take a DIY approach or hire an outside entertainer.\n\n`;

    reply += `Current Budget Reality:\n`;
    if (isBudgetFull) {
      reply += `Your current ${formatCentsToCurrency(event.totalBudgetCents, currency)} budget is already 100% allocated (${formatCentsToCurrency(budgetSummary.totalEstimatedCostCents, currency)} committed) with ${formatCentsToCurrency(budgetSummary.unallocatedBudgetCents, currency)} in reserve buffer.\n\nAdding this competition without exceeding your budget envelope will require either increasing your total budget by ~₹1,500 or reallocating funds from lower-priority items (such as non-essential decor or printed favors).\n\n`;
    } else {
      reply += `You have ${formatCentsToCurrency(budgetSummary.unallocatedBudgetCents, currency)} unallocated buffer remaining from your ${formatCentsToCurrency(event.totalBudgetCents, currency)} budget, which can cover part or all of this addition.\n\n`;
    }

    reply += `Transparent Cost Drivers:\n`;
    reply += `1. Prizes & Medals (Essential): ₹600 – ₹1,200 for medals, participation ribbons, or art gift packs so every participating child feels celebrated.\n`;
    reply += `2. Music & Audio Setup (Conditional): ₹0 if your venue already provides a Bluetooth PA speaker; ₹800 – ₹1,500 if you need to rent a portable speaker with microphone.\n`;
    reply += `3. Emcee / Host (Optional): ₹0 if a fun family member or older cousin leads the music and games; ₹2,000 – ₹3,500 if hiring an external party host.\n`;
    reply += `4. Fun Dance Props: ₹300 – ₹600 for ribbons, balloons, or floor markers.\n\n`;

    reply += `(Note: These figures are provisional planning estimates based on typical Indian celebration expenses, not verified local vendor quotes.)\n\n`;

    reply += `One quick question: How many children do you expect to participate (e.g., 5–10 or 15+), and does your venue already provide a sound speaker?\n`;

    suggestedActions.push({
      id: `act-dance-comp-${Date.now()}`,
      type: "PROPOSE_BUDGET_ITEM",
      title: "Kids Dance Competition Prizes & Props",
      description: "Provisional allocation for children's dance competition medals, participation prizes, and props.",
      payload: {
        category: "Entertainment",
        amountCents: 150000,
      },
    });

    followUpPrompts = [
      "Around 10 kids will participate.",
      "We already have a speaker at the venue.",
      "How can I stay within my budget?",
    ];
  }

  // 2. Follow-Up Refinement (e.g. "Around 10 kids")
  else if (intent === "FOLLOW_UP_REFINEMENT") {
    const kids = extractedCount || 10;
    const prizePerChild = 100;
    const totalPrizes = kids * prizePerChild;
    const propsCost = 300;
    const soundEmceeCost = 0;
    const totalIncremental = totalPrizes + propsCost + soundEmceeCost;
    const totalIncrementalCents = totalIncremental * 100;
    const revisedTotalCents = event.totalBudgetCents + totalIncrementalCents;
    const percentIncrease = ((totalIncrementalCents / event.totalBudgetCents) * 100).toFixed(1);

    reply = `Based on ${kids} participating children, here is your refined, transparent budget breakdown for the dance competition:\n\n`;

    reply += `Revised Calculation for ${kids} Children:\n`;
    reply += `• Prizes & Tokens (${kids} kids at approx ₹${prizePerChild} per child): ${formatCentsToCurrency(totalPrizes * 100, currency)} (small art kits or medals so no child is left out)\n`;
    reply += `• Dance Props & Certificates: ${formatCentsToCurrency(propsCost * 100, currency)}\n`;
    reply += `• Music & Emcee: ₹0 (assuming family anchor + venue Bluetooth audio)\n`;
    reply += `• Total Recommended Budget Addition: ${formatCentsToCurrency(totalIncrementalCents, currency)} (provisional estimate)\n\n`;

    reply += `Budget Impact:\n`;
    reply += `• Current Allocated Budget: ${formatCentsToCurrency(event.totalBudgetCents, currency)}\n`;
    reply += `• Revised Total Needed: ${formatCentsToCurrency(revisedTotalCents, currency)} (+${percentIncrease}% increase)\n\n`;

    reply += `Would you like to add this as a provisional ${formatCentsToCurrency(totalIncrementalCents, currency)} Entertainment line item in your Budget Ledger?`;

    suggestedActions.push({
      id: `act-dance-refined-${Date.now()}`,
      type: "PROPOSE_BUDGET_ITEM",
      title: `Kids Dance Competition Prizes & Favors (${kids} kids)`,
      description: `Refined allocation for ${kids} participating children with participation prizes and props.`,
      payload: {
        category: "Entertainment",
        amountCents: totalIncrementalCents,
      },
    });

    followUpPrompts = [
      "How can I stay within my budget?",
      "Help me plan the next seven days.",
      "What should I book first?",
    ];
  }

  // 3. Next 7 Days / Timeline
  else if (intent === "TIMELINE_SCHEDULE") {
    const upcoming = milestones
      .filter((m) => m.status !== "COMPLETED")
      .slice(0, 3);

    reply = `Here is your priority focus for the next 7 days for ${event.title} (${timelineSummary.daysUntilEvent} days until celebration):\n\n`;

    if (upcoming.length > 0) {
      reply += `1. Immediate Milestones to Advance:\n`;
      upcoming.forEach((m) => {
        reply += `   • ${m.title} (Target: ${m.dueAt})${m.description ? ` — ${m.description}` : ""}\n`;
      });
      reply += `\n`;
    }

    if (event.archetype === "BIRTHDAY") {
      reply += `2. Vendor Follow-Ups: Reconnect with bakery for custom cake design and confirm decorator backdrop dimensions.\n`;
      reply += `3. Family Coordination: Send digital WhatsApp save-the-dates or invitations with venue location pin.\n`;
      reply += `4. Logistics Checklist: Double-check toddler soft play zone arrangements and elderly family seating.\n`;

      suggestedActions.push({
        id: `act-task-invites-${Date.now()}`,
        type: "PROPOSE_TASK",
        title: "Send WhatsApp Digital Invitations & RSVP Link",
        description: "Distribute designed invitation flyer to family and close friends with Google Maps location pin.",
        payload: {
          category: "Family Coordination",
          priority: "HIGH",
          dueAt: milestones[0]?.dueAt || event.eventDate,
        },
      });
    } else {
      reply += `2. Vendor Follow-Ups: Verify quotations from top caterers and decor specialists.\n`;
      reply += `3. Ceremony Samagri: Confirm puja timing and requirements with family elders.\n`;
    }

    followUpPrompts = [
      "How can I stay within my budget?",
      "What should I book first?",
      "Create a checklist for coordinating my family.",
    ];
  }

  // 4. What to Book First / Priority Order
  else if (intent === "VENDOR_RECOMMENDATION") {
    reply = `Recommended Booking Sequence for ${event.title}:\n\n`;
    reply += `For a seamless celebration, lock in vendors in this critical sequence:\n\n`;
    reply += `1. Venue and Banquet Hall: Lock the venue date and timing slot first, as everything else depends on room dimensions, catering restrictions, and noise curfews.\n`;
    reply += `2. Caterer & Custom Cake: Good caterers and custom cake bakers book out weeks in advance for weekends and auspicious muhurats.\n`;
    reply += `3. Photographer & Videographer: Solo candid photographers take only one booking per evening slot.\n`;
    reply += `4. Decor & Theme Styling: Once venue dimensions are confirmed, finalize backdrop frames and lighting requirements.\n`;
    reply += `5. Entertainment & Return Gifts: Emcee, kids activities, and return gift hampers can be finalized 10 to 14 days prior.\n`;

    suggestedActions.push({
      id: `act-task-venue-${Date.now()}`,
      type: "PROPOSE_TASK",
      title: "Lock In Venue & Confirm Outside Decorator Policy",
      description: "Confirm hall booking slot, electric generator backup capacity, and noise curfew guidelines.",
      payload: {
        category: "Venue & Banquet",
        priority: "CRITICAL",
        dueAt: milestones[0]?.dueAt || event.eventDate,
      },
    });

    followUpPrompts = [
      "How much to add a kids' dance competition?",
      "Help me plan the next seven days.",
      "How can I stay within my budget?",
    ];
  }

  // 5. Guest Count Scaling
  else if (intent === "GUEST_COUNT_CHANGE") {
    const extraGuests = extractedCount || 10;
    const newGuestCount = event.guestCount + extraGuests;
    const perGuestCents = event.guestCount > 0 ? Math.round(budgetSummary.totalEstimatedCostCents / event.guestCount) : 150000;
    const projectedAdditionalCents = perGuestCents * extraGuests;

    reply = `If ${extraGuests} more guests attend (increasing from ${event.guestCount} to ${newGuestCount} guests), your projected incremental cost is approx ${formatCentsToCurrency(projectedAdditionalCents, currency)}:\n\n`;
    reply += `• Variable Cost Per Guest: Approx ${formatCentsToCurrency(perGuestCents, currency)} for catering plates and return gift hampers.\n`;
    reply += `• Fixed Cost Items: Venue rent, photography, and backdrop decor remain unchanged.\n`;
    reply += `• Hall Capacity Check: Confirm with your venue that dining tables and seating comfortably accommodate ${newGuestCount} attendees.\n`;

    suggestedActions.push({
      id: `act-adj-guests-${Date.now()}`,
      type: "PROPOSE_PLAN_ADJUSTMENT",
      title: `Simulate Scaling to ${newGuestCount} Guests`,
      description: "Open Plan Adjustments to simulate live recalculations across all guest-sensitive ledger items.",
      payload: {
        simulatedGuests: newGuestCount,
        targetTab: "impact",
      },
    });

    followUpPrompts = [
      "How can I stay within my budget?",
      "Help me plan the next seven days.",
      "Create a checklist for coordinating my family.",
    ];
  }

  // 6. Family Coordination
  else if (intent === "FAMILY_COORDINATION") {
    reply = `Family Coordination Checklist for ${event.title}:\n\n`;
    reply += `In Indian celebrations, delegating specific roles to family members ensures the hosts can genuinely enjoy the occasion:\n\n`;
    reply += `1. Elders & Grandparents Comfort: Assign a cousin to coordinate comfortable front-row sofa seating, step-free access, and serving tea or warm water upon arrival.\n`;
    reply += `2. Welcome & Aarti Desk: Delegate greeting arriving relatives, applying tika/chandan, and distributing welcome drinks.\n`;
    reply += `3. Cake & Puja Samagri Lead: Keep puja thali, matches, cake knife, sparkler candles, and wet wipes ready 15 minutes before the ceremony.\n`;
    reply += `4. Return Gifts Point-Person: Place curated return gift parcels near the exit and ensure each visiting child and elder receives their hamper.\n`;
    reply += `5. Vendor Settlement: Appoint one family member with cash or UPI access to settle remaining vendor balances on-site.\n`;

    suggestedActions.push({
      id: `act-family-elder-task-${Date.now()}`,
      type: "PROPOSE_TASK",
      title: "Assign Family Elder Hospitality & Refreshment Lead",
      description: "Designate cousin or family lead for greeting grandparents, arranging comfortable seating, and dietary care.",
      payload: {
        category: "Family Coordination",
        priority: "MEDIUM",
        dueAt: event.eventDate,
      },
    });

    followUpPrompts = [
      "Help me plan the next seven days.",
      "What should I book first?",
      "How can I stay within my budget?",
    ];
  }

  // 7. Intimate Gathering (25 guests)
  else if (intent === "INTIMATE_GATHERING") {
    reply = `Tailored Plan for an Intimate Gathering (~25 Guests) for ${event.title}:\n\n`;
    reply += `An intimate celebration of 25 close family and friends allows for high personalization and warmth:\n\n`;
    reply += `• Setting: Ideal for a residential clubhouse, private dining pergola, or home terrace with fairy lights.\n`;
    reply += `• Food & Catering: Live chaat counter + 1 to 2 hot regional delicacies (such as Chhena Poda or hot jalebi with rabri) and custom eggless designer cake.\n`;
    reply += `• Photo Corner: A customized 7-foot balloon and pastel floral arch creates stunning keepsake family portraits without banquet hall overhead.\n`;
    reply += `• Favors: 25 curated eco-friendly hampers with seed pencils, artisan wooden toys, and personalized thank-you tags.\n`;

    suggestedActions.push({
      id: `act-intimate-decor-${Date.now()}`,
      type: "PROPOSE_BUDGET_ITEM",
      title: "Intimate Garden Balloon Arch & Photo Corner",
      description: "Freestanding circular arch with pastel biodegradable balloons and customized baby name plaque.",
      payload: {
        category: "Themes & Decor",
        amountCents: 1500000,
      },
    });

    followUpPrompts = [
      "What should I book first?",
      "How can I stay within my budget?",
      "Help me plan the next seven days.",
    ];
  }

  // 8. General Budget Overview
  else if (intent === "BUDGET_OVERVIEW") {
    const alloc = budgetSummary.allocationPercent;
    const buffer = budgetSummary.unallocatedBudgetCents;

    reply = `Budget Advisory for ${event.title}:\n\n`;
    reply += `Your budget of ${formatCentsToCurrency(event.totalBudgetCents, currency)} is currently ${alloc}% allocated with ${formatCentsToCurrency(buffer, currency)} ${buffer < 0 ? "over budget" : "in reserve buffer"}.\n\n`;

    const topItem = [...budgetItems].sort((a, b) => b.estimatedCostCents - a.estimatedCostCents)[0];
    if (topItem) {
      reply += `Your single largest planned line item is ${topItem.description} at ${formatCentsToCurrency(topItem.estimatedCostCents, currency)} (${topItem.category}).\n\n`;
    }

    reply += `Recommended Cost-Saving Trade-Offs:\n`;
    reply += `1. Catering Stations: Opt for high-impact live chaat and hot dessert counters rather than an oversized 7-course buffet to save ~15 to 20% on food waste.\n`;
    reply += `2. Floral & Decor: Blend fresh seasonal marigolds or baby's breath with reusable fabric drapery instead of 100% imported exotic blooms.\n`;
    reply += `3. Direct Wholesale Sourcing: Source return gifts directly from artisan clusters for bespoke quality at wholesale rates.\n`;

    suggestedActions.push({
      id: `act-budget-buffer-${Date.now()}`,
      type: "NAVIGATE_TAB",
      title: "Review Itemized Budget Ledger",
      description: "Inspect category allocations and status filters in your financial workspace.",
      payload: {
        targetTab: "budget",
      },
    });

    followUpPrompts = [
      "How much to add a kids' dance competition?",
      "What should I book first?",
      "What if 10 more guests attend?",
    ];
  }

  // 9. General Greeting / Fallback
  else {
    reply = `Hello! I am your Celebration Copilot for ${event.title}.\n\n`;
    reply += `Celebration Details:\n`;
    reply += `• Celebration: ${event.archetype} on ${formatIndianDate(event.eventDate)} (${timelineSummary.daysUntilEvent} days remaining)\n`;
    reply += `• Guest Count: ${event.guestCount} guests in ${event.location || "your venue"}\n`;
    reply += `• Budget Status: ${formatCentsToCurrency(budgetSummary.totalEstimatedCostCents, currency)} allocated of ${formatCentsToCurrency(event.totalBudgetCents, currency)} (${budgetSummary.allocationPercent}% allocated)\n`;
    reply += `• Milestones: ${timelineSummary.completedMilestones} of ${timelineSummary.totalMilestones} completed\n\n`;
    reply += `How can I help you today? You can ask about adding activities (like games or dance competitions), checking your 7-day schedule, or optimizing your budget.`;

    followUpPrompts = [
      "How much to add a kids' dance competition?",
      "Help me plan the next seven days.",
      "How can I stay within my budget?",
    ];
  }

  // Strip any accidental markdown symbols (# hashtags, * asterisks) to ensure clean natural language
  const cleanReply = stripMarkdownSymbols(reply);

  return {
    success: true,
    reply: cleanReply,
    suggestedActions,
    followUpPrompts,
    provider: "deterministic_copilot",
    modelUsed: "synapse-celebration-advisor-v1",
    generationDurationMs: Date.now() - startTime,
  };
}

/**
 * Main Copilot Chat Entrypoint:
 * If GEMINI_API_KEY is configured, sends the grounded prompt to Google GenAI.
 * If not configured or if an error/timeout occurs, invokes the deterministic celebration advisor.
 */
export async function executeCopilotChat(
  plan: CompleteEventPlan,
  request: CopilotChatRequest,
  apiKeyOverride?: string
): Promise<CopilotChatResponse> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  const startTime = Date.now();
  const { intent } = classifyCopilotIntent(request.message, request.history);

  // If no API key configured, use deterministic grounded advisor with honest reporting
  if (!apiKey || apiKey.trim().length === 0) {
    return generateDeterministicCopilotAdvice(plan, request);
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const { summaryString } = buildEventGroundingContext(plan, intent);

    const systemInstruction = `
You are the SynapseEvent Celebration Copilot, an elite celebration planning concierge specializing in Indian celebrations (birthdays, weddings, anniversaries, family milestones).
You provide warm, conversational, culturally nuanced, and practical guidance.

CRITICAL FORMATTING INSTRUCTIONS:
1. DO NOT USE MARKDOWN HEADINGS (#, ##, ###) OR ASTERISKS (*, **). Output plain, clean, elegant text with clean numbering (1., 2.) and standard punctuation only. No hashtags and no asterisks.
2. ANSWER THE QUESTION FIRST: The very first sentence of your reply MUST directly answer the user's specific inquiry. NEVER start with a generic summary, pleasantries, or repeat the entire budget unless explicitly asked for a full ledger report.
3. For questions about adding an activity or entertainment (such as a kids' dance competition, games, or photo booth):
   - Immediately provide a realistic incremental budget range (e.g. ₹1,200 to ₹3,500).
   - State the current budget reality (whether current budget is 100% allocated with ₹0 buffer).
   - Itemize the primary cost drivers (Prizes/Medals, Sound/Audio, Emcee/Host, Props).
   - Clearly label estimates as provisional, not verified vendor quotes.
   - Ask ONE concise follow-up question that materially improves the recommendation (e.g., number of participating children and whether venue provides a sound system).
4. In follow-up turns (e.g., when the user provides child count), refine the estimate directly using conversation history without resetting or repeating generic overviews.
5. All arithmetic must be calculated deterministically and accurately.
6. Suggest 1 structured action (PROPOSE_BUDGET_ITEM or PROPOSE_TASK) with realistic integer amounts in cents/paise (multiply INR by 100).
7. Format your response strictly as JSON matching this schema:
{
  "reply": "string (plain, clean text without any # or * symbols)",
  "suggestedActions": [
    {
      "id": "string",
      "type": "PROPOSE_TASK" | "PROPOSE_BUDGET_ITEM" | "PROPOSE_PLAN_ADJUSTMENT" | "NAVIGATE_TAB",
      "title": "string",
      "description": "string",
      "payload": {
        "category": "string optional",
        "amountCents": number optional,
        "dueAt": "YYYY-MM-DD optional",
        "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" optional,
        "targetTab": "string optional"
      }
    }
  ],
  "followUpPrompts": ["string", "string", "string"]
}
`.trim();

    const conversationPrompt = `
CURRENT EVENT CONTEXT:
${summaryString}

USER'S MESSAGE:
"${request.message}"

CONVERSATION HISTORY:
${(request.history || []).map((h) => `${h.role}: ${h.content}`).join("\n")}
`.trim();

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("AI_PROVIDER_TIMEOUT"));
      }, AI_REQUEST_TIMEOUT_MS);
    });

    const callPromise = ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: conversationPrompt }],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    // Suppress late unhandled rejections if callPromise rejects after timeout
    callPromise.catch(() => {});

    let response;
    try {
      response = await Promise.race([callPromise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    const responseText = response.text;


    if (!responseText || responseText.trim().length === 0) {
      throw new Error("EMPTY_AI_RESPONSE");
    }

    const parsedJson = JSON.parse(responseText);
    const cleanReply = stripMarkdownSymbols(parsedJson.reply || "I have reviewed your event details.");

    return {
      success: true,
      reply: cleanReply,
      suggestedActions: Array.isArray(parsedJson.suggestedActions) ? parsedJson.suggestedActions : [],
      followUpPrompts: Array.isArray(parsedJson.followUpPrompts) ? parsedJson.followUpPrompts : [
        "How much to add a kids' dance competition?",
        "Help me plan the next seven days.",
        "How can I stay within my budget?",
      ],
      provider: "gemini",
      modelUsed: model,
      generationDurationMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Live AI error";
    console.warn("Live Copilot encounter error, applying deterministic fallback:", errorMsg);
    return generateDeterministicCopilotAdvice(plan, request);
  }
}
