import { z } from "zod";
import {
  EventArchetypeEnum,
  BudgetItemSchema,
  TimelineMilestoneSchema,
  VendorTaskSchema,
  IdeaItemSchema,
} from "./schemas";

// ==============================================================================
// 1. PROVIDER-NEUTRAL AI REQUEST CONTRACT (India-First Defaults)
// ==============================================================================

export const GenerateEventPlanRequestSchema = z.object({
  eventId: z.string().uuid(),
  archetype: EventArchetypeEnum,
  title: z.string().trim().min(1).max(120),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().max(50).default("Asia/Kolkata").optional(),
  totalBudgetCents: z.number().int().min(0),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).default("INR").optional(),
  guestCount: z.number().int().min(0),
  location: z.string().max(200).default("TBD"),
  theme: z.string().max(200).optional(),
  priorities: z.string().max(500).optional(),
  subtypes: z.array(z.string()).default([]).optional(),
  dietary: z.string().max(200).optional(),
  preferences: z.record(z.string(), z.unknown()).default({}),
});
export type GenerateEventPlanRequest = z.infer<typeof GenerateEventPlanRequestSchema>;

// ==============================================================================
// 2. PLANNING ASSUMPTIONS SCHEMA
// ==============================================================================

export const PlanningAssumptionsSchema = z.object({
  budgetAssumptions: z.array(z.string().max(300)).default([]),
  guestCountAssumptions: z.array(z.string().max(300)).default([]),
  locationSpecificUncertainties: z.array(z.string().max(300)).default([]),
  itemsRequiringUserConfirmation: z.array(z.string().max(300)).default([]),
  permissionsToVerify: z.array(z.string().max(300)).default([]).optional(),
});
export type PlanningAssumptions = z.infer<typeof PlanningAssumptionsSchema>;

// ==============================================================================
// 3. STRUCTURED PLAN OUTPUT CONTRACT (Strict Schema for Plan Generation)
// ==============================================================================

export const AiGeneratedPlanResponseSchema = z.object({
  budgetItems: z.array(
    BudgetItemSchema.omit({
      id: true,
      eventId: true,
      createdAt: true,
      updatedAt: true,
      origin: true,
      isCustomByUser: true,
    })
  ),
  milestones: z.array(
    TimelineMilestoneSchema.omit({
      id: true,
      eventId: true,
      createdAt: true,
      updatedAt: true,
      origin: true,
      isCustomByUser: true,
    })
  ),
  vendorTasks: z.array(
    VendorTaskSchema.omit({
      id: true,
      eventId: true,
      createdAt: true,
      updatedAt: true,
      origin: true,
      isCustomByUser: true,
    })
  ),
  ideas: z.array(
    IdeaItemSchema.omit({
      id: true,
      eventId: true,
      createdAt: true,
      updatedAt: true,
      origin: true,
      isCustomByUser: true,
    })
  ),
  assumptions: PlanningAssumptionsSchema.default({
    budgetAssumptions: [],
    guestCountAssumptions: [],
    locationSpecificUncertainties: [],
    itemsRequiringUserConfirmation: [],
    permissionsToVerify: [],
  }),
});
export type AiGeneratedPlanResponse = z.infer<typeof AiGeneratedPlanResponseSchema>;

// ==============================================================================
// 4. PROVIDER EXECUTION RESULT ENVELOPE (With explicit modes & failure states)
// ==============================================================================

export type PlanGenerationMode = "AI_GENERATED" | "TEMPLATE_GENERATED" | "FAILED";

export type AiProviderErrorCode =
  | "MISSING_API_KEY"
  | "PROVIDER_TIMEOUT"
  | "RATE_LIMIT_EXCEEDED"
  | "SCHEMA_VALIDATION_FAILED"
  | "SERVICE_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface PlanGenerationFailure {
  success: false;
  mode: "FAILED";
  errorCode: AiProviderErrorCode;
  errorMessage: string;
  isRetryable: boolean;
}

export interface PlanGenerationSuccess {
  success: true;
  mode: "AI_GENERATED" | "TEMPLATE_GENERATED";
  plan: AiGeneratedPlanResponse;
  provider: "gemini" | "deterministic_template";
  modelUsed: string;
  generationDurationMs: number;
  notice?: string;
}

export type PlanGenerationResult = PlanGenerationSuccess | PlanGenerationFailure;
