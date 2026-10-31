import {
  AiGeneratedPlanResponseSchema,
  type GenerateEventPlanRequest,
  type PlanGenerationResult,
  type AiGeneratedPlanResponse,
} from "@/lib/domain/ai-contracts";
import { getArchetypeFallbackPlan, getArchetypeSystemPrompt } from "./archetypes";
import { calculateBudgetSummary } from "@/lib/domain/budget";
import { formatCentsToCurrency } from "@/lib/domain/money";
import type { BudgetItemEntity } from "@/lib/domain/schemas";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const AI_REQUEST_TIMEOUT_MS = 8000;

/**
 * Sanitizes and recalculates all financial totals deterministically
 * using the domain budget engine. Ensures no negative amounts or float errors exist.
 */
export function sanitizeAndVerifyPlanMath(
  plan: AiGeneratedPlanResponse,
  totalBudgetCents: number,
  guestCount: number,
  eventId: string,
  currency: string = "INR"
): AiGeneratedPlanResponse {
  // Convert items into typed entities for calculation engine
  const entities: BudgetItemEntity[] = plan.budgetItems.map((item, index) => ({
    id: `temp-budget-${index}`,
    eventId,
    category: item.category,
    description: item.description,
    estimatedCostCents: Math.max(0, Math.round(item.estimatedCostCents)),
    actualCostCents: 0,
    status: item.status ?? "ESTIMATED",
    origin: "AI_GENERATED",
    isCustomByUser: false,
    isGuestSensitive: item.isGuestSensitive ?? false,
    estimatedUnitCostCents: item.estimatedUnitCostCents,
    assumptions: item.assumptions,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Run pure deterministic calculation
  const summary = calculateBudgetSummary(totalBudgetCents, guestCount, entities);

  // Return clean plan with verified non-negative integer cents/paise
  return {
    ...plan,
    budgetItems: entities.map((e) => ({
      category: e.category,
      description: e.description,
      estimatedCostCents: e.estimatedCostCents,
      actualCostCents: 0,
      status: e.status,
      isGuestSensitive: e.isGuestSensitive,
      estimatedUnitCostCents: e.estimatedUnitCostCents,
      assumptions: e.assumptions,
    })),
    assumptions: {
      ...plan.assumptions,
      budgetAssumptions: [
        ...plan.assumptions.budgetAssumptions,
        `Deterministic Engine: Total allocated is ${formatCentsToCurrency(
          summary.totalEstimatedCostCents,
          currency
        )} of ${formatCentsToCurrency(totalBudgetCents, currency)} total budget (${
          summary.allocationPercent
        }% allocated).`,
      ],
    },
  };
}

/**
 * Main provider-neutral entrypoint for event plan generation.
 * Attempts Gemini SDK generation if API key is present.
 * Transparently and safely falls back to deterministic archetype templates if API key is missing or fails.
 */
export async function generateEventPlan(
  req: GenerateEventPlanRequest,
  options?: {
    forceFallback?: boolean;
    apiKeyOverride?: string;
  }
): Promise<PlanGenerationResult> {
  const startTime = Date.now();
  const apiKey = options?.apiKeyOverride || process.env.GEMINI_API_KEY;
  const currency = req.currency || "INR";

  // 1. If fallback forced or API key missing -> use high-quality deterministic benchmark templates
  if (options?.forceFallback || !apiKey || apiKey.trim().length === 0) {
    const fallbackPlan = getArchetypeFallbackPlan(req);
    const verifiedPlan = sanitizeAndVerifyPlanMath(
      fallbackPlan,
      req.totalBudgetCents,
      req.guestCount,
      req.eventId,
      currency
    );

    return {
      success: true,
      mode: "TEMPLATE_GENERATED",
      plan: verifiedPlan,
      provider: "deterministic_template",
      modelUsed: "synapse-benchmark-engine-v1",
      generationDurationMs: Date.now() - startTime,
      notice: "Plan generated using benchmark planning templates. Configure GEMINI_API_KEY for live AI synthesis.",
    };
  }

  // 2. Live Gemini Generation
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const systemInstruction = getArchetypeSystemPrompt(req.archetype);

    const userPrompt = JSON.stringify({
      archetype: req.archetype,
      title: req.title,
      eventDate: req.eventDate,
      totalBudgetCents: req.totalBudgetCents,
      currency,
      guestCount: req.guestCount,
      location: req.location,
      theme: req.theme || "Standard",
      priorities: req.priorities || "Standard balanced planning",
      subtypes: req.subtypes,
      dietary: req.dietary,
      preferences: req.preferences,
    });

    // Run with timeout race and guaranteed timer cleanup
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("AI_PROVIDER_TIMEOUT")),
        AI_REQUEST_TIMEOUT_MS
      );
    });

    const callPromise = ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate an event plan according to the system instructions. User parameters:\n${userPrompt}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });
    // Suppress unhandled rejection if timeout wins the race
    callPromise.catch(() => {});

    let response;
    try {
      response = await Promise.race([callPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    const responseText = response.text;

    if (!responseText || responseText.trim().length === 0) {
      throw new Error("EMPTY_AI_RESPONSE");
    }

    // Parse and validate strictly against Zod contract
    const parsedJson = JSON.parse(responseText);
    const parsedPlan = AiGeneratedPlanResponseSchema.safeParse(parsedJson);

    if (!parsedPlan.success) {
      console.warn("Gemini output failed schema validation, applying fallback template:", parsedPlan.error.format());
      const fallback = getArchetypeFallbackPlan(req);
      const verified = sanitizeAndVerifyPlanMath(
        fallback,
        req.totalBudgetCents,
        req.guestCount,
        req.eventId,
        currency
      );
      return {
        success: true,
        mode: "TEMPLATE_GENERATED",
        plan: verified,
        provider: "deterministic_template",
        modelUsed: `${model}-schema-fallback`,
        generationDurationMs: Date.now() - startTime,
        notice: "AI generated an invalid structure; safely substituted with verified archetype template.",
      };
    }

    // Math recalculation check
    const verifiedLivePlan = sanitizeAndVerifyPlanMath(
      parsedPlan.data,
      req.totalBudgetCents,
      req.guestCount,
      req.eventId,
      currency
    );

    return {
      success: true,
      mode: "AI_GENERATED",
      plan: verifiedLivePlan,
      provider: "gemini",
      modelUsed: model,
      generationDurationMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown AI error";
    console.warn("Live AI generation encountered error, activating fallback template:", errorMsg);

    const fallbackPlan = getArchetypeFallbackPlan(req);
    const verified = sanitizeAndVerifyPlanMath(
      fallbackPlan,
      req.totalBudgetCents,
      req.guestCount,
      req.eventId,
      currency
    );

    return {
      success: true,
      mode: "TEMPLATE_GENERATED",
      plan: verified,
      provider: "deterministic_template",
      modelUsed: "synapse-benchmark-engine-v1",
      generationDurationMs: Date.now() - startTime,
      notice: `AI provider unavailable (${errorMsg}). Plan successfully populated via benchmark template.`,
    };
  }
}
