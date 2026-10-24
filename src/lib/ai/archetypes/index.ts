import type { EventArchetype } from "@/lib/domain/schemas";
import type { GenerateEventPlanRequest, AiGeneratedPlanResponse } from "@/lib/domain/ai-contracts";
import { WEDDING_SYSTEM_PROMPT, generateWeddingFallbackPlan } from "./wedding";
import { BIRTHDAY_SYSTEM_PROMPT, generateBirthdayFallbackPlan } from "./birthday";
import { COMMUNITY_SYSTEM_PROMPT, generateCommunityFallbackPlan } from "./community";

export function getArchetypeSystemPrompt(archetype: EventArchetype): string {
  switch (archetype) {
    case "WEDDING":
      return WEDDING_SYSTEM_PROMPT;
    case "BIRTHDAY":
      return BIRTHDAY_SYSTEM_PROMPT;
    case "COMMUNITY":
      return COMMUNITY_SYSTEM_PROMPT;
    default:
      return BIRTHDAY_SYSTEM_PROMPT;
  }
}

export function getArchetypeFallbackPlan(
  req: GenerateEventPlanRequest
): AiGeneratedPlanResponse {
  switch (req.archetype) {
    case "WEDDING":
      return generateWeddingFallbackPlan(req);
    case "BIRTHDAY":
      return generateBirthdayFallbackPlan(req);
    case "COMMUNITY":
      return generateCommunityFallbackPlan(req);
    default:
      return generateBirthdayFallbackPlan(req);
  }
}
