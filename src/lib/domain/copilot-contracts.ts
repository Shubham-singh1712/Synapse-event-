import { z } from "zod";

export const CopilotActionTypeEnum = z.enum([
  "PROPOSE_BUDGET_ITEM",
  "PROPOSE_TASK",
  "PROPOSE_PLAN_ADJUSTMENT",
  "NAVIGATE_TAB",
]);
export type CopilotActionType = z.infer<typeof CopilotActionTypeEnum>;

export const CopilotProposedActionSchema = z.object({
  id: z.string(),
  type: CopilotActionTypeEnum,
  title: z.string(),
  description: z.string(),
  payload: z.object({
    category: z.string().optional(),
    amountCents: z.number().int().optional(),
    dueAt: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    simulatedGuests: z.number().int().optional(),
    simulatedBudgetCents: z.number().int().optional(),
    targetTab: z.string().optional(),
  }),
  applied: z.boolean().default(false).optional(),
});
export type CopilotProposedAction = z.infer<typeof CopilotProposedActionSchema>;

export const CopilotChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(10)
    .optional(),
  intent: z
    .enum(["GENERAL", "BUDGET_ANALYSIS", "VENDOR_ANALYSIS", "PLAN_ADJUSTMENT"])
    .default("GENERAL")
    .optional(),
});
export type CopilotChatRequest = z.infer<typeof CopilotChatRequestSchema>;

export const CopilotChatResponseSchema = z.object({
  success: z.boolean(),
  reply: z.string(),
  contextSummary: z.string().optional(),
  suggestedActions: z.array(CopilotProposedActionSchema).default([]),
  followUpPrompts: z.array(z.string()).default([]),
  provider: z.enum(["gemini", "deterministic_copilot"]),
  modelUsed: z.string(),
  generationDurationMs: z.number().default(0),
});
export type CopilotChatResponse = z.infer<typeof CopilotChatResponseSchema>;
