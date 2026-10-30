import { z } from "zod";

// ==============================================================================
// ENUMS & CONSTANTS
// ==============================================================================

export const EventArchetypeEnum = z.enum(["WEDDING", "BIRTHDAY", "COMMUNITY"]);
export type EventArchetype = z.infer<typeof EventArchetypeEnum>;

export const RecordOriginEnum = z.enum(["AI_GENERATED", "USER_CUSTOM", "USER_MODIFIED"]);
export type RecordOrigin = z.infer<typeof RecordOriginEnum>;

export const BudgetItemStatusEnum = z.enum([
  "ESTIMATED",
  "QUOTED",
  "COMMITTED",
  "PAID",
  "CANCELLED",
]);
export type BudgetItemStatus = z.infer<typeof BudgetItemStatusEnum>;

export const PaymentStatusEnum = z.enum([
  "PENDING",
  "ADVANCE_PAID",
  "FULLY_PAID",
  "OVERDUE",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const EstimateSourceEnum = z.enum([
  "AI_ESTIMATE",
  "USER_ESTIMATE",
  "VENDOR_QUOTATION",
  "ACTUAL_EXPENSE",
]);
export type EstimateSource = z.infer<typeof EstimateSourceEnum>;

export const MilestoneStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export type MilestoneStatus = z.infer<typeof MilestoneStatusEnum>;

export const VendorTaskStatusEnum = z.enum([
  "NOT_STARTED",
  "INQUIRY_SENT",
  "PROPOSAL_RECEIVED",
  "CONTRACT_SIGNED",
  "DEPOSIT_PAID",
  "COMPLETED",
  "CANCELLED",
]);
export type VendorTaskStatus = z.infer<typeof VendorTaskStatusEnum>;

export const IdeaCategoryEnum = z.enum([
  "THEME",
  "ACTIVITY",
  "MENU",
  "DECOR",
  "ENTERTAINMENT",
  "LOGISTICS",
]);
export type IdeaCategory = z.infer<typeof IdeaCategoryEnum>;

export const BudgetCategoryEnum = z.enum([
  "VENUE",
  "CATERING",
  "ENTERTAINMENT",
  "PHOTOGRAPHY_VIDEO",
  "DECOR_FLORAL",
  "PERMITS_LOGISTICS",
  "MARKETING_INVITES",
  "BUFFER_CONTINGENCY",
  "MISCELLANEOUS",
]);
export type BudgetCategory = z.infer<typeof BudgetCategoryEnum>;

// Optional Sub-ceremonies and Indian Celebration Subtypes
export const WeddingCeremonyEnum = z.enum([
  "ENGAGEMENT",
  "MEHENDI",
  "HALDI",
  "SANGEET",
  "BARAAT",
  "WEDDING_CEREMONY",
  "RECEPTION",
]);
export type WeddingCeremony = z.infer<typeof WeddingCeremonyEnum>;

export const BirthdayCelebrationTypeEnum = z.enum([
  "MILESTONE_BIRTHDAY",
  "THEMED_PARTY",
  "KIDS_BIRTHDAY",
  "FAMILY_CELEBRATION",
]);
export type BirthdayCelebrationType = z.infer<typeof BirthdayCelebrationTypeEnum>;

export const CommunityCelebrationTypeEnum = z.enum([
  "CULTURAL_FESTIVAL",
  "COLLEGE_FESTIVAL",
  "RELIGIOUS_GATHERING",
  "NEIGHBORHOOD_UTSAV",
]);
export type CommunityCelebrationType = z.infer<typeof CommunityCelebrationTypeEnum>;

// Validation Boundaries
export const MAX_GUESTS = 100_000;
export const MIN_GUESTS = 0;
export const MAX_BUDGET_CENTS = 1_000_000_000_00; // 1 Billion in minor units (paise/cents)
export const MIN_BUDGET_CENTS = 0;

// ==============================================================================
// 1. EVENT SCHEMA
// ==============================================================================

export const EventSchema = z.object({
  id: z.string().uuid("Invalid event ID format"),
  workspaceId: z.string().uuid("Invalid workspace ID format"),
  title: z
    .string()
    .trim()
    .min(1, "Event title is required")
    .max(120, "Title cannot exceed 120 characters"),
  archetype: EventArchetypeEnum,
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Event date must be in YYYY-MM-DD format"),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .max(50, "Timezone cannot exceed 50 characters")
    .default("Asia/Kolkata"),
  location: z
    .string()
    .trim()
    .max(200, "Location cannot exceed 200 characters")
    .default("TBD"),
  guestCount: z
    .number()
    .int("Guest count must be an integer")
    .min(MIN_GUESTS, "Guest count cannot be negative")
    .max(MAX_GUESTS, `Guest count cannot exceed ${MAX_GUESTS.toLocaleString()}`),
  totalBudgetCents: z
    .number()
    .int("Total budget must be an integer in minor units (paise/cents)")
    .min(MIN_BUDGET_CENTS, "Budget cannot be negative")
    .max(MAX_BUDGET_CENTS, "Budget exceeds maximum allowed"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code (e.g. INR)")
    .default("INR"),
  preferences: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
});
export type EventEntity = z.infer<typeof EventSchema>;

export const CreateEventInputSchema = EventSchema.omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

/**
 * Policy: For new event planning, target event date must be today or in the future.
 */
export function validateEventDate(
  eventDate: string,
  asOfDate?: string
): { isValid: boolean; error?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return { isValid: false, error: "Event date must be in YYYY-MM-DD format." };
  }
  const todayStr =
    asOfDate ??
    (() => {
      const now = new Date();
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
        now.getUTCDate()
      ).padStart(2, "0")}`;
    })();

  if (eventDate < todayStr) {
    return {
      isValid: false,
      error: "Event date cannot be in the past. SynapseEvent is designed for future event planning.",
    };
  }
  return { isValid: true };
}

// ==============================================================================
// 2. BUDGET ITEM SCHEMA (With Indian Cost Tracking & Advance Distinction)
// ==============================================================================

export const BudgetItemSchema = z.object({
  id: z.string().uuid("Invalid budget item ID"),
  eventId: z.string().uuid("Invalid event ID"),
  category: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(200),
  estimatedCostCents: z
    .number()
    .int("Estimated cost must be an integer in minor units (paise/cents)")
    .min(0, "Cost cannot be negative")
    .max(MAX_BUDGET_CENTS),
  actualCostCents: z
    .number()
    .int("Actual cost must be an integer in minor units (paise/cents)")
    .min(0, "Actual cost cannot be negative")
    .max(MAX_BUDGET_CENTS)
    .default(0),
  quotedCostCents: z
    .number()
    .int("Quoted cost must be an integer")
    .min(0)
    .max(MAX_BUDGET_CENTS)
    .optional(),
  bookingAdvanceCents: z
    .number()
    .int("Booking advance must be an integer")
    .min(0)
    .max(MAX_BUDGET_CENTS)
    .optional(),
  paidAmountCents: z
    .number()
    .int("Paid amount must be an integer")
    .min(0)
    .max(MAX_BUDGET_CENTS)
    .optional(),
  paymentDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment due date must be in YYYY-MM-DD format")
    .optional(),
  paymentStatus: PaymentStatusEnum.default("PENDING").optional(),
  estimateSource: EstimateSourceEnum.default("AI_ESTIMATE").optional(),
  status: BudgetItemStatusEnum.default("ESTIMATED"),
  origin: RecordOriginEnum.default("AI_GENERATED"),
  isCustomByUser: z.boolean().default(false),
  isGuestSensitive: z.boolean().default(false),
  estimatedUnitCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
  assumptions: z.string().trim().max(500).optional(),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
});
export type BudgetItemEntity = z.infer<typeof BudgetItemSchema>;
export const BudgetItemEntitySchema = BudgetItemSchema;

// ==============================================================================
// 3. TIMELINE MILESTONE SCHEMA
// ==============================================================================

export const MilestonePriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type MilestonePriority = z.infer<typeof MilestonePriorityEnum>;

export const TimelineMilestoneSchema = z.object({
  id: z.string().uuid("Invalid milestone ID"),
  eventId: z.string().uuid("Invalid event ID"),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).default(""),
  dueAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format"),
  offsetDaysFromEvent: z.number().int().optional(),
  status: MilestoneStatusEnum.default("NOT_STARTED"),
  priority: MilestonePriorityEnum.default("MEDIUM").optional(),
  dependencies: z.array(z.string()).default([]).optional(),
  origin: RecordOriginEnum.default("AI_GENERATED"),
  isCustomByUser: z.boolean().default(false),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
});
export type TimelineMilestoneEntity = z.infer<typeof TimelineMilestoneSchema>;

// ==============================================================================
// 4. VENDOR TASK SCHEMA
// ==============================================================================

export const VendorTaskSchema = z.object({
  id: z.string().uuid("Invalid vendor task ID"),
  eventId: z.string().uuid("Invalid event ID"),
  category: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(150),
  requirements: z.string().trim().max(1000).default(""),
  status: VendorTaskStatusEnum.default("NOT_STARTED"),
  estimatedCostCents: z
    .number()
    .int()
    .min(0)
    .max(MAX_BUDGET_CENTS)
    .optional(),
  suggestedLeadTimeDays: z.number().int().min(0).max(1000).optional(),
  origin: RecordOriginEnum.default("AI_GENERATED"),
  isCustomByUser: z.boolean().default(false),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
});
export type VendorTaskEntity = z.infer<typeof VendorTaskSchema>;

// ==============================================================================
// 5. IDEA ITEM SCHEMA
// ==============================================================================

export const IdeaItemSchema = z.object({
  id: z.string().uuid("Invalid idea item ID"),
  eventId: z.string().uuid("Invalid event ID"),
  category: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000),
  whyItFits: z.string().trim().max(500).default("").optional(),
  budgetCategory: z.string().trim().max(50).optional(),
  estimatedCostCents: z
    .number()
    .int()
    .min(0)
    .max(MAX_BUDGET_CENTS)
    .optional(),
  origin: RecordOriginEnum.default("AI_GENERATED"),
  isCustomByUser: z.boolean().default(false),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
});
export type IdeaItemEntity = z.infer<typeof IdeaItemSchema>;

// ==============================================================================
// 6. GUEST WORKSPACE & CREDENTIAL SCHEMA
// ==============================================================================

export const GuestWorkspaceSchema = z.object({
  id: z.string().uuid(),
  tokenHash: z.string().length(64, "Token hash must be SHA-256 (64 hex characters)"),
  name: z.string().trim().min(1).max(100).default("Guest Workspace"),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
});
export type GuestWorkspaceEntity = z.infer<typeof GuestWorkspaceSchema>;

// ==============================================================================
// 7. COMPOSITE EVENT PLAN OUTPUT SCHEMA (For AI Preparation)
// ==============================================================================

export const EventPlanSchema = z.object({
  event: EventSchema,
  budgetItems: z.array(BudgetItemSchema),
  milestones: z.array(TimelineMilestoneSchema),
  vendorTasks: z.array(VendorTaskSchema),
  ideas: z.array(IdeaItemSchema),
});
export type EventPlan = z.infer<typeof EventPlanSchema>;

// ==============================================================================
// 8. EVENT WORKSPACE MUTATION & PATCH SCHEMAS
// ==============================================================================

export const UpdateEventDetailsPayloadSchema = z
  .object({
    action: z.literal("UPDATE_EVENT_DETAILS"),
    updates: z
      .object({
        title: z.string().trim().min(1).max(120).optional(),
        eventDate: z.string().optional(),
        location: z.string().trim().max(200).optional(),
        guestCount: z.number().int().min(0).max(MAX_GUESTS).optional(),
        totalBudgetCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
        preferences: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
    title: z.string().trim().min(1).max(120).optional(),
    eventDate: z.string().optional(),
    location: z.string().trim().max(200).optional(),
    guestCount: z.number().int().min(0).max(MAX_GUESTS).optional(),
    totalBudgetCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) =>
      data.updates !== undefined ||
      data.title !== undefined ||
      data.eventDate !== undefined ||
      data.location !== undefined ||
      data.guestCount !== undefined ||
      data.totalBudgetCents !== undefined ||
      data.preferences !== undefined,
    { message: "At least one event detail update field must be provided." }
  );

export const AddBudgetItemPayloadSchema = z.object({
  action: z.literal("ADD_BUDGET_ITEM"),
  category: z.string().trim().max(50).default("General").optional(),
  description: z.string().trim().min(1, "description is required").max(200),
  estimatedCostCents: z
    .number()
    .int("estimatedCostCents must be an integer")
    .min(0)
    .max(MAX_BUDGET_CENTS),
  actualCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
  status: BudgetItemStatusEnum.optional(),
  isGuestSensitive: z.boolean().optional(),
});

export const UpdateBudgetItemPayloadSchema = z.object({
  action: z.literal("UPDATE_BUDGET_ITEM"),
  itemId: z.string().min(1, "itemId is required"),
  category: z.string().trim().max(50).optional(),
  description: z.string().trim().max(200).optional(),
  estimatedCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
  actualCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
  status: BudgetItemStatusEnum.optional(),
});

export const DeleteBudgetItemPayloadSchema = z.object({
  action: z.literal("DELETE_BUDGET_ITEM"),
  itemId: z.string().min(1, "itemId is required"),
});

export const AddMilestonePayloadSchema = z.object({
  action: z.literal("ADD_MILESTONE"),
  title: z.string().trim().min(1, "title is required").max(150),
  dueAt: z.string().min(1, "dueAt is required"),
  description: z.string().trim().max(500).optional(),
  offsetDaysFromEvent: z.number().int().optional(),
});

export const UpdateMilestonePayloadSchema = z.object({
  action: z.literal("UPDATE_MILESTONE"),
  milestoneId: z.string().min(1, "milestoneId is required"),
  status: MilestoneStatusEnum.optional(),
  title: z.string().trim().max(150).optional(),
  description: z.string().trim().max(500).optional(),
  dueAt: z.string().optional(),
});

export const DeleteMilestonePayloadSchema = z.object({
  action: z.literal("DELETE_MILESTONE"),
  milestoneId: z.string().min(1, "milestoneId is required"),
});

export const AddVendorTaskPayloadSchema = z.object({
  action: z.literal("ADD_VENDOR_TASK"),
  title: z.string().trim().min(1, "title is required").max(150),
  category: z.string().trim().max(50).optional(),
  requirements: z.string().trim().max(1000).optional(),
  estimatedCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
});

export const UpdateVendorTaskPayloadSchema = z.object({
  action: z.literal("UPDATE_VENDOR_TASK"),
  taskId: z.string().min(1, "taskId is required"),
  status: VendorTaskStatusEnum.optional(),
  requirements: z.string().trim().max(1000).optional(),
  title: z.string().trim().max(150).optional(),
  category: z.string().trim().max(50).optional(),
  estimatedCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).nullable().optional(),
});

export const DeleteVendorTaskPayloadSchema = z.object({
  action: z.literal("DELETE_VENDOR_TASK"),
  taskId: z.string().min(1, "taskId is required"),
});

export const ConvertIdeaPayloadSchema = z.object({
  action: z.literal("CONVERT_IDEA"),
  ideaId: z.string().min(1, "ideaId is required"),
  asType: z.enum(["BUDGET", "TASK", "BUDGET_ITEM", "MILESTONE", "VENDOR_TASK"]),
});

export const LegacyUpdateBudgetItemPayloadSchema = z.object({
  action: z.undefined(),
  itemId: z.string().min(1, "itemId is required"),
  category: z.string().trim().max(50).optional(),
  description: z.string().trim().max(200).optional(),
  estimatedCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
  actualCostCents: z.number().int().min(0).max(MAX_BUDGET_CENTS).optional(),
  status: BudgetItemStatusEnum.optional(),
});

export const PatchEventPayloadSchema = z.union([
  UpdateEventDetailsPayloadSchema,
  AddBudgetItemPayloadSchema,
  UpdateBudgetItemPayloadSchema,
  DeleteBudgetItemPayloadSchema,
  AddMilestonePayloadSchema,
  UpdateMilestonePayloadSchema,
  DeleteMilestonePayloadSchema,
  AddVendorTaskPayloadSchema,
  UpdateVendorTaskPayloadSchema,
  DeleteVendorTaskPayloadSchema,
  ConvertIdeaPayloadSchema,
  LegacyUpdateBudgetItemPayloadSchema,
]);

export type PatchEventPayload = z.infer<typeof PatchEventPayloadSchema>;

// ==============================================================================
// AUTHENTICATION SCHEMAS
// ==============================================================================

export const SignInPayloadSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type SignInPayload = z.infer<typeof SignInPayloadSchema>;

export const SignUpPayloadSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});
export type SignUpPayload = z.infer<typeof SignUpPayloadSchema>;
