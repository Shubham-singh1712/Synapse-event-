import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  events,
  budgetItems,
  timelineMilestones,
  vendorTasks,
  ideaItems,
  workspaces,
} from "@/lib/db/schema";
import { assertWorkspaceOwnership, UnauthorizedError } from "@/lib/auth/guest-workspace";
import type {
  EventEntity,
  BudgetItemEntity,
  TimelineMilestoneEntity,
  VendorTaskEntity,
  IdeaItemEntity,
} from "@/lib/domain/schemas";
import type { AiGeneratedPlanResponse, PlanGenerationMode } from "@/lib/domain/ai-contracts";
import { calculateBudgetSummary, type BudgetFinancialSummary } from "@/lib/domain/budget";
import {
  calculateTimelineSummary,
  getCalendarDaysDiff,
  isValidCalendarDate,
  type TimelineSummary,
} from "@/lib/domain/timeline";

export interface CompleteEventPlan {
  event: EventEntity;
  budgetItems: BudgetItemEntity[];
  milestones: TimelineMilestoneEntity[];
  vendorTasks: VendorTaskEntity[];
  ideas: IdeaItemEntity[];
  budgetSummary: BudgetFinancialSummary;
  timelineSummary: TimelineSummary;
  generationMode: PlanGenerationMode;
  assumptions: AiGeneratedPlanResponse["assumptions"];
}

export interface UserEventSummaryItem {
  id: string;
  title: string;
  archetype: "WEDDING" | "BIRTHDAY" | "COMMUNITY";
  eventDate: string;
  location: string;
  guestCount: number;
  totalBudgetCents: number;
  totalEstimatedCostCents: number;
  currency: string;
  completedMilestones: number;
  totalMilestones: number;
  daysUntilEvent: number;
  createdAt: Date;
}

export type AuthContext =
  | string
  | {
      workspaceId?: string;
      userId?: string;
    };

function checkEventOwnership(
  event: { workspaceId: string; userId?: string | null },
  authContext: AuthContext
): void {
  if (typeof authContext === "string") {
    // Backwards compatibility for workspaceId string
    assertWorkspaceOwnership(event.workspaceId, authContext);
    return;
  }

  const { workspaceId, userId } = authContext;
  if (userId && event.userId && event.userId === userId) {
    return; // Authorized via user session
  }
  if (workspaceId && event.workspaceId === workspaceId) {
    return; // Authorized via guest workspace session
  }

  throw new UnauthorizedError("Forbidden: Access denied. Resource belongs to another workspace or account.");
}

/**
 * Persists an event and all its associated generated plan entities atomically inside a transaction.
 * If any table insert fails, the entire transaction rolls back.
 */
export async function persistEventAndPlan(
  eventData: {
    id: string;
    workspaceId: string;
    userId?: string;
    title: string;
    archetype: "WEDDING" | "BIRTHDAY" | "COMMUNITY";
    eventDate: string;
    timezone: string;
    location: string;
    guestCount: number;
    totalBudgetCents: number;
    currency: string;
    preferences: Record<string, unknown>;
  },
  plan: AiGeneratedPlanResponse,
  generationMode: PlanGenerationMode = "TEMPLATE_GENERATED"
): Promise<{ eventId: string }> {
  const db = getDb();

  return await db.transaction(async (tx) => {
    // 1. Ensure workspace exists (create workspace if not yet inserted)
    const existingWs = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, eventData.workspaceId))
      .limit(1);

    if (existingWs.length === 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await tx.insert(workspaces).values({
        id: eventData.workspaceId,
        userId: eventData.userId ?? null,
        tokenHash: "ws_session_hash_" + eventData.workspaceId.slice(0, 8),
        name: eventData.title ? `${eventData.title} Workspace` : "Planning Workspace",
        expiresAt,
      });
    }

    // 2. Insert event
    await tx.insert(events).values({
      id: eventData.id,
      userId: eventData.userId ?? null,
      workspaceId: eventData.workspaceId,
      title: eventData.title,
      archetype: eventData.archetype,
      eventDate: eventData.eventDate,
      timezone: eventData.timezone,
      location: eventData.location,
      guestCount: eventData.guestCount,
      totalBudgetCents: eventData.totalBudgetCents,
      currency: eventData.currency,
      preferences: {
        ...eventData.preferences,
        generationMode,
        assumptions: plan.assumptions,
      },
    });

    // 3. Insert budget items
    if (plan.budgetItems.length > 0) {
      await tx.insert(budgetItems).values(
        plan.budgetItems.map((item) => ({
          eventId: eventData.id,
          category: item.category,
          description: item.description,
          estimatedCostCents: item.estimatedCostCents,
          actualCostCents: item.actualCostCents ?? 0,
          status: item.status ?? "ESTIMATED",
          origin: "AI_GENERATED",
          isCustomByUser: false,
          isGuestSensitive: item.isGuestSensitive ?? false,
        }))
      );
    }

    // 4. Insert timeline milestones
    if (plan.milestones.length > 0) {
      await tx.insert(timelineMilestones).values(
        plan.milestones.map((m) => ({
          eventId: eventData.id,
          title: m.title,
          description: m.description,
          dueAt: m.dueAt,
          offsetDaysFromEvent: m.offsetDaysFromEvent,
          status: m.status ?? "NOT_STARTED",
          origin: "AI_GENERATED",
          isCustomByUser: false,
        }))
      );
    }

    // 5. Insert vendor tasks
    if (plan.vendorTasks.length > 0) {
      await tx.insert(vendorTasks).values(
        plan.vendorTasks.map((t) => ({
          eventId: eventData.id,
          category: t.category,
          title: t.title,
          requirements: t.requirements,
          status: t.status ?? "NOT_STARTED",
          estimatedCostCents: t.estimatedCostCents,
          origin: "AI_GENERATED",
          isCustomByUser: false,
        }))
      );
    }

    // 6. Insert ideas
    if (plan.ideas.length > 0) {
      await tx.insert(ideaItems).values(
        plan.ideas.map((i) => ({
          eventId: eventData.id,
          category: i.category,
          title: i.title,
          description: i.description,
          estimatedCostCents: i.estimatedCostCents,
          origin: "AI_GENERATED",
          isCustomByUser: false,
        }))
      );
    }

    return { eventId: eventData.id };
  });
}

/**
 * Loads an event and all its associated plan entities.
 * Strictly verifies workspace / user authorization before returning data.
 */
export async function getEventWithPlan(
  eventId: string,
  authContext: AuthContext
): Promise<CompleteEventPlan | null> {
  const db = getDb();

  // 1. Fetch event
  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const eventRow = eventRows[0];
  if (!eventRow) {
    return null;
  }

  // 2. Strict IDOR Authorization Check
  checkEventOwnership(
    { workspaceId: eventRow.workspaceId, userId: eventRow.userId },
    authContext
  );

  // 3. Fetch related records with deterministic ordering
  const [bRows, mRows, vRows, iRows] = await Promise.all([
    db.select().from(budgetItems).where(eq(budgetItems.eventId, eventId)).orderBy(asc(budgetItems.createdAt)),
    db.select().from(timelineMilestones).where(eq(timelineMilestones.eventId, eventId)).orderBy(asc(timelineMilestones.dueAt)),
    db.select().from(vendorTasks).where(eq(vendorTasks.eventId, eventId)).orderBy(asc(vendorTasks.createdAt)),
    db.select().from(ideaItems).where(eq(ideaItems.eventId, eventId)).orderBy(asc(ideaItems.createdAt)),
  ]);

  const parsedEvent: EventEntity = {
    id: eventRow.id,
    workspaceId: eventRow.workspaceId,
    title: eventRow.title,
    archetype: eventRow.archetype as EventEntity["archetype"],
    eventDate: eventRow.eventDate,
    timezone: eventRow.timezone,
    location: eventRow.location,
    guestCount: eventRow.guestCount,
    totalBudgetCents: eventRow.totalBudgetCents,
    currency: eventRow.currency,
    preferences: (eventRow.preferences as Record<string, unknown>) ?? {},
    createdAt: eventRow.createdAt,
    updatedAt: eventRow.updatedAt,
  };

  const typedBudgetItems: BudgetItemEntity[] = bRows.map((b) => ({
    id: b.id,
    eventId: b.eventId,
    category: b.category,
    description: b.description,
    estimatedCostCents: b.estimatedCostCents,
    actualCostCents: b.actualCostCents,
    status: b.status as BudgetItemEntity["status"],
    origin: b.origin as BudgetItemEntity["origin"],
    isCustomByUser: b.isCustomByUser,
    isGuestSensitive: b.isGuestSensitive,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));

  const typedMilestones: TimelineMilestoneEntity[] = mRows.map((m) => ({
    id: m.id,
    eventId: m.eventId,
    title: m.title,
    description: m.description ?? "",
    dueAt: m.dueAt,
    offsetDaysFromEvent: m.offsetDaysFromEvent ?? undefined,
    status: m.status as TimelineMilestoneEntity["status"],
    priority: "MEDIUM",
    dependencies: [],
    origin: m.origin as TimelineMilestoneEntity["origin"],
    isCustomByUser: m.isCustomByUser,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));

  const typedVendorTasks: VendorTaskEntity[] = vRows.map((v) => ({
    id: v.id,
    eventId: v.eventId,
    category: v.category,
    title: v.title,
    requirements: v.requirements ?? "",
    status: v.status as VendorTaskEntity["status"],
    estimatedCostCents: v.estimatedCostCents ?? undefined,
    origin: v.origin as VendorTaskEntity["origin"],
    isCustomByUser: v.isCustomByUser,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));

  const typedIdeas: IdeaItemEntity[] = iRows.map((i) => ({
    id: i.id,
    eventId: i.eventId,
    category: i.category,
    title: i.title,
    description: i.description,
    whyItFits: "",
    estimatedCostCents: i.estimatedCostCents ?? undefined,
    origin: i.origin as IdeaItemEntity["origin"],
    isCustomByUser: i.isCustomByUser,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }));

  // Deterministic domain calculations
  const budgetSummary = calculateBudgetSummary(
    parsedEvent.totalBudgetCents,
    parsedEvent.guestCount,
    typedBudgetItems
  );

  const timelineSummary = calculateTimelineSummary(
    parsedEvent.eventDate,
    typedMilestones
  );

  const prefs = parsedEvent.preferences as Record<string, unknown>;
  const generationMode = (prefs.generationMode as PlanGenerationMode) || "TEMPLATE_GENERATED";
  const assumptions = (prefs.assumptions as AiGeneratedPlanResponse["assumptions"]) || {
    budgetAssumptions: [],
    guestCountAssumptions: [],
    locationSpecificUncertainties: [],
    itemsRequiringUserConfirmation: [],
  };

  return {
    event: parsedEvent,
    budgetItems: typedBudgetItems,
    milestones: typedMilestones,
    vendorTasks: typedVendorTasks,
    ideas: typedIdeas,
    budgetSummary,
    timelineSummary,
    generationMode,
    assumptions,
  };
}

/**
 * Returns all events associated with a user or workspace for the dashboard.
 */
export async function getUserEvents(
  authFilter: { userId?: string; workspaceId?: string }
): Promise<UserEventSummaryItem[]> {
  const db = getDb();

  let eventRows: (typeof events.$inferSelect)[];
  if (authFilter.userId) {
    eventRows = await db
      .select()
      .from(events)
      .where(eq(events.userId, authFilter.userId))
      .orderBy(desc(events.createdAt));
  } else if (authFilter.workspaceId) {
    eventRows = await db
      .select()
      .from(events)
      .where(eq(events.workspaceId, authFilter.workspaceId))
      .orderBy(desc(events.createdAt));
  } else {
    return [];
  }

  if (eventRows.length === 0) {
    return [];
  }

  const eventIds = eventRows.map((e) => e.id);

  // Batch query child records in parallel (2 constant-time batch queries instead of 2N per-event queries)
  const [allBudgetItems, allMilestones] = await Promise.all([
    db
      .select({
        eventId: budgetItems.eventId,
        status: budgetItems.status,
        estimatedCostCents: budgetItems.estimatedCostCents,
      })
      .from(budgetItems)
      .where(inArray(budgetItems.eventId, eventIds)),
    db
      .select({
        eventId: timelineMilestones.eventId,
        status: timelineMilestones.status,
      })
      .from(timelineMilestones)
      .where(inArray(timelineMilestones.eventId, eventIds)),
  ]);

  // Aggregate budget estimates by eventId (excluding CANCELLED items to mirror domain rules)
  const budgetTotalsByEvent = new Map<string, number>();
  for (const b of allBudgetItems) {
    if (b.status === "CANCELLED") {
      continue;
    }
    const current = budgetTotalsByEvent.get(b.eventId) || 0;
    budgetTotalsByEvent.set(b.eventId, current + (b.estimatedCostCents || 0));
  }

  // Aggregate milestone counts by eventId
  const milestoneStatsByEvent = new Map<string, { total: number; completed: number }>();
  for (const m of allMilestones) {
    const stats = milestoneStatsByEvent.get(m.eventId) || { total: 0, completed: 0 };
    stats.total += 1;
    if (m.status === "COMPLETED") {
      stats.completed += 1;
    }
    milestoneStatsByEvent.set(m.eventId, stats);
  }

  const today = new Date().toISOString().split("T")[0]!;
  const todayTime = new Date(`${today}T00:00:00Z`).getTime();

  return eventRows.map((event) => {
    const totalEstimatedCostCents = budgetTotalsByEvent.get(event.id) || 0;
    const mStats = milestoneStatsByEvent.get(event.id) || { total: 0, completed: 0 };
    const eventTime = new Date(`${event.eventDate}T00:00:00Z`).getTime();
    const daysUntilEvent = Math.ceil((eventTime - todayTime) / 86400000);

    return {
      id: event.id,
      title: event.title,
      archetype: event.archetype as "WEDDING" | "BIRTHDAY" | "COMMUNITY",
      eventDate: event.eventDate,
      location: event.location,
      guestCount: event.guestCount,
      totalBudgetCents: event.totalBudgetCents,
      totalEstimatedCostCents,
      currency: event.currency || "INR",
      completedMilestones: mStats.completed,
      totalMilestones: mStats.total,
      daysUntilEvent,
      createdAt: event.createdAt,
    };
  });
}

/**
 * Deletes an event and all child entities via cascade.
 */
export async function deleteEvent(
  eventId: string,
  authContext: AuthContext
): Promise<{ success: boolean }> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) {
    throw new Error(`Event not found: ${eventId}`);
  }

  checkEventOwnership(eventRows[0]!, authContext);

  await db.delete(events).where(eq(events.id, eventId));
  return { success: true };
}

/**
 * Updates a budget item belonging to an event.
 */
export async function updateBudgetItem(
  eventId: string,
  itemId: string,
  updates: {
    estimatedCostCents?: number;
    actualCostCents?: number;
    status?: BudgetItemEntity["status"];
    description?: string;
    category?: string;
  },
  authContext: AuthContext
): Promise<{ success: boolean; updatedItem: BudgetItemEntity }> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) {
    throw new Error(`Event not found: ${eventId}`);
  }

  checkEventOwnership(eventRows[0]!, authContext);

  if (updates.estimatedCostCents !== undefined && updates.estimatedCostCents < 0) {
    throw new Error("Estimated cost cannot be negative.");
  }
  if (updates.actualCostCents !== undefined && updates.actualCostCents < 0) {
    throw new Error("Actual cost cannot be negative.");
  }

  const updatePayload: Record<string, unknown> = {
    origin: "USER_MODIFIED",
    isCustomByUser: true,
    updatedAt: new Date(),
  };

  if (updates.estimatedCostCents !== undefined) updatePayload.estimatedCostCents = updates.estimatedCostCents;
  if (updates.actualCostCents !== undefined) updatePayload.actualCostCents = updates.actualCostCents;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.description !== undefined) updatePayload.description = updates.description.trim();
  if (updates.category !== undefined) updatePayload.category = updates.category.trim();

  const updatedRows = await db
    .update(budgetItems)
    .set(updatePayload)
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.eventId, eventId)))
    .returning();

  if (updatedRows.length === 0) {
    throw new Error(`Budget item not found: ${itemId}`);
  }

  const row = updatedRows[0]!;
  const updatedItem: BudgetItemEntity = {
    id: row.id,
    eventId: row.eventId,
    category: row.category,
    description: row.description,
    estimatedCostCents: row.estimatedCostCents,
    actualCostCents: row.actualCostCents,
    status: row.status as BudgetItemEntity["status"],
    origin: row.origin as BudgetItemEntity["origin"],
    isCustomByUser: row.isCustomByUser,
    isGuestSensitive: row.isGuestSensitive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return { success: true, updatedItem };
}

/**
 * Adds a new budget item to an event.
 */
export async function addBudgetItem(
  eventId: string,
  item: {
    category: string;
    description: string;
    estimatedCostCents: number;
    actualCostCents?: number;
    status?: BudgetItemEntity["status"];
    isGuestSensitive?: boolean;
  },
  authContext: AuthContext
): Promise<BudgetItemEntity> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  const [row] = await db
    .insert(budgetItems)
    .values({
      eventId,
      category: item.category.trim(),
      description: item.description.trim(),
      estimatedCostCents: Math.max(0, Math.round(item.estimatedCostCents)),
      actualCostCents: Math.max(0, Math.round(item.actualCostCents ?? 0)),
      status: item.status ?? "ESTIMATED",
      origin: "USER_CUSTOM",
      isCustomByUser: true,
      isGuestSensitive: item.isGuestSensitive ?? false,
    })
    .returning();

  if (!row) throw new Error("Failed to insert budget item");

  return {
    id: row.id,
    eventId: row.eventId,
    category: row.category,
    description: row.description,
    estimatedCostCents: row.estimatedCostCents,
    actualCostCents: row.actualCostCents,
    status: row.status as BudgetItemEntity["status"],
    origin: row.origin as BudgetItemEntity["origin"],
    isCustomByUser: row.isCustomByUser,
    isGuestSensitive: row.isGuestSensitive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Deletes a budget item from an event.
 */
export async function deleteBudgetItem(
  eventId: string,
  itemId: string,
  authContext: AuthContext
): Promise<{ success: boolean }> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  await db
    .delete(budgetItems)
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.eventId, eventId)));

  return { success: true };
}

/**
 * Updates a milestone status or details.
 */
export async function updateMilestone(
  eventId: string,
  milestoneId: string,
  updates: {
    status?: TimelineMilestoneEntity["status"];
    title?: string;
    description?: string;
    dueAt?: string;
  },
  authContext: AuthContext
): Promise<{ success: boolean; milestone: TimelineMilestoneEntity }> {
  const db = getDb();

  const eventRows = await db
    .select({
      workspaceId: events.workspaceId,
      userId: events.userId,
      eventDate: events.eventDate,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  const updatePayload: Record<string, unknown> = {
    origin: "USER_MODIFIED",
    isCustomByUser: true,
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.description !== undefined) updatePayload.description = updates.description.trim();
  if (updates.dueAt !== undefined) {
    const trimmedDue = updates.dueAt.trim();
    updatePayload.dueAt = trimmedDue;
    if (eventRows[0]?.eventDate && isValidCalendarDate(trimmedDue)) {
      updatePayload.offsetDaysFromEvent = getCalendarDaysDiff(
        eventRows[0].eventDate,
        trimmedDue
      );
    }
  }

  const [row] = await db
    .update(timelineMilestones)
    .set(updatePayload)
    .where(and(eq(timelineMilestones.id, milestoneId), eq(timelineMilestones.eventId, eventId)))
    .returning();

  if (!row) throw new Error("Milestone not found");

  return {
    success: true,
    milestone: {
      id: row.id,
      eventId: row.eventId,
      title: row.title,
      description: row.description ?? "",
      dueAt: row.dueAt,
      offsetDaysFromEvent: row.offsetDaysFromEvent ?? undefined,
      status: row.status as TimelineMilestoneEntity["status"],
      priority: "MEDIUM",
      dependencies: [],
      origin: row.origin as TimelineMilestoneEntity["origin"],
      isCustomByUser: row.isCustomByUser,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}

/**
 * Updates a vendor task status.
 */
export async function updateVendorTask(
  eventId: string,
  taskId: string,
  updates: {
    status?: VendorTaskEntity["status"];
    requirements?: string;
    title?: string;
    category?: string;
    estimatedCostCents?: number | null;
  },
  authContext: AuthContext
): Promise<{ success: boolean; task: VendorTaskEntity }> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  const updatePayload: Record<string, unknown> = {
    origin: "USER_MODIFIED",
    isCustomByUser: true,
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.requirements !== undefined) updatePayload.requirements = updates.requirements.trim();
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.category !== undefined) updatePayload.category = updates.category.trim();
  if (updates.estimatedCostCents !== undefined) updatePayload.estimatedCostCents = updates.estimatedCostCents;

  const [row] = await db
    .update(vendorTasks)
    .set(updatePayload)
    .where(and(eq(vendorTasks.id, taskId), eq(vendorTasks.eventId, eventId)))
    .returning();

  if (!row) throw new Error("Vendor task not found");

  return {
    success: true,
    task: {
      id: row.id,
      eventId: row.eventId,
      category: row.category,
      title: row.title,
      requirements: row.requirements ?? "",
      status: row.status as VendorTaskEntity["status"],
      estimatedCostCents: row.estimatedCostCents ?? undefined,
      origin: row.origin as VendorTaskEntity["origin"],
      isCustomByUser: row.isCustomByUser,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}

/**
 * Connects a personalized idea into the active plan (as a budget item or task).
 */
export async function convertIdeaToPlanItem(
  eventId: string,
  ideaId: string,
  asType: "BUDGET" | "TASK",
  authContext: AuthContext
): Promise<{ success: boolean; createdId: string }> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  const ideaRows = await db
    .select()
    .from(ideaItems)
    .where(and(eq(ideaItems.id, ideaId), eq(ideaItems.eventId, eventId)))
    .limit(1);

  const idea = ideaRows[0];
  if (!idea) throw new Error("Idea not found");

  if (asType === "BUDGET") {
    const [bItem] = await db
      .insert(budgetItems)
      .values({
        eventId,
        category: idea.category,
        description: `[Idea] ${idea.title}: ${idea.description.slice(0, 80)}`,
        estimatedCostCents: idea.estimatedCostCents ?? 0,
        actualCostCents: 0,
        status: "ESTIMATED",
        origin: "USER_CUSTOM",
        isCustomByUser: true,
      })
      .returning();
    return { success: true, createdId: bItem.id };
  } else {
    const [task] = await db
      .insert(vendorTasks)
      .values({
        eventId,
        category: idea.category,
        title: `[Idea Task] ${idea.title}`,
        requirements: idea.description,
        status: "NOT_STARTED",
        estimatedCostCents: idea.estimatedCostCents ?? undefined,
        origin: "USER_CUSTOM",
        isCustomByUser: true,
      })
      .returning();
    return { success: true, createdId: task.id };
  }
}

/**
 * Updates core event details (title, date, location, guest count, total budget).
 */
export async function updateEventDetails(
  eventId: string,
  updates: {
    title?: string;
    eventDate?: string;
    location?: string;
    guestCount?: number;
    totalBudgetCents?: number;
    preferences?: Record<string, unknown>;
  },
  authContext: AuthContext
): Promise<{ success: boolean; event: EventEntity }> {
  const db = getDb();

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  const existing = eventRows[0]!;
  checkEventOwnership(existing, authContext);

  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.eventDate !== undefined) {
    updatePayload.eventDate = updates.eventDate.includes("T")
      ? updates.eventDate.split("T")[0]
      : updates.eventDate;
  }
  if (updates.location !== undefined) updatePayload.location = updates.location.trim();
  if (updates.guestCount !== undefined) updatePayload.guestCount = Math.max(1, updates.guestCount);
  if (updates.totalBudgetCents !== undefined) updatePayload.totalBudgetCents = Math.max(0, updates.totalBudgetCents);
  if (updates.preferences !== undefined) {
    updatePayload.preferences = {
      ...((existing.preferences as Record<string, unknown>) || {}),
      ...updates.preferences,
    };
  }

  const [row] = await db
    .update(events)
    .set(updatePayload)
    .where(eq(events.id, eventId))
    .returning();

  if (!row) throw new Error("Failed to update event");

  return {
    success: true,
    event: {
      id: row.id,
      workspaceId: row.workspaceId,
      title: row.title,
      archetype: row.archetype as EventEntity["archetype"],
      eventDate: row.eventDate,
      timezone: row.timezone,
      location: row.location,
      guestCount: row.guestCount,
      totalBudgetCents: row.totalBudgetCents,
      currency: row.currency,
      preferences: (row.preferences as Record<string, unknown>) ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}

/**
 * Adds a new custom milestone to the event timeline.
 */
export async function addMilestone(
  eventId: string,
  milestone: {
    title: string;
    dueAt: string;
    description?: string;
    offsetDaysFromEvent?: number;
  },
  authContext: AuthContext
): Promise<TimelineMilestoneEntity> {
  const db = getDb();

  const eventRows = await db
    .select({
      workspaceId: events.workspaceId,
      userId: events.userId,
      eventDate: events.eventDate,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  const offsetDays =
    milestone.offsetDaysFromEvent !== undefined
      ? milestone.offsetDaysFromEvent
      : eventRows[0]?.eventDate && isValidCalendarDate(milestone.dueAt)
      ? getCalendarDaysDiff(eventRows[0].eventDate, milestone.dueAt)
      : undefined;

  const [row] = await db
    .insert(timelineMilestones)
    .values({
      eventId,
      title: milestone.title.trim(),
      description: milestone.description?.trim() ?? "",
      dueAt: milestone.dueAt,
      offsetDaysFromEvent: offsetDays,
      status: "NOT_STARTED",
      origin: "USER_CUSTOM",
      isCustomByUser: true,
    })
    .returning();

  if (!row) throw new Error("Failed to insert milestone");

  return {
    id: row.id,
    eventId: row.eventId,
    title: row.title,
    description: row.description ?? "",
    dueAt: row.dueAt,
    offsetDaysFromEvent: row.offsetDaysFromEvent ?? undefined,
    status: row.status as TimelineMilestoneEntity["status"],
    priority: "MEDIUM",
    dependencies: [],
    origin: row.origin as TimelineMilestoneEntity["origin"],
    isCustomByUser: row.isCustomByUser,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Deletes a milestone from the event timeline.
 */
export async function deleteMilestone(
  eventId: string,
  milestoneId: string,
  authContext: AuthContext
): Promise<{ success: boolean }> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  await db
    .delete(timelineMilestones)
    .where(and(eq(timelineMilestones.id, milestoneId), eq(timelineMilestones.eventId, eventId)));

  return { success: true };
}

/**
 * Adds a new custom vendor task to the event.
 */
export async function addVendorTask(
  eventId: string,
  task: {
    category: string;
    title: string;
    requirements?: string;
    estimatedCostCents?: number;
  },
  authContext: AuthContext
): Promise<VendorTaskEntity> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  const [row] = await db
    .insert(vendorTasks)
    .values({
      eventId,
      category: task.category.trim() || "General",
      title: task.title.trim(),
      requirements: task.requirements?.trim() ?? "",
      status: "NOT_STARTED",
      estimatedCostCents: task.estimatedCostCents ?? null,
      origin: "USER_CUSTOM",
      isCustomByUser: true,
    })
    .returning();

  if (!row) throw new Error("Failed to insert vendor task");

  return {
    id: row.id,
    eventId: row.eventId,
    category: row.category,
    title: row.title,
    requirements: row.requirements ?? "",
    status: row.status as VendorTaskEntity["status"],
    estimatedCostCents: row.estimatedCostCents ?? undefined,
    origin: row.origin as VendorTaskEntity["origin"],
    isCustomByUser: row.isCustomByUser,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Deletes a vendor task from the event.
 */
export async function deleteVendorTask(
  eventId: string,
  taskId: string,
  authContext: AuthContext
): Promise<{ success: boolean }> {
  const db = getDb();

  const eventRows = await db
    .select({ workspaceId: events.workspaceId, userId: events.userId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventRows.length === 0) throw new Error("Event not found");
  checkEventOwnership(eventRows[0]!, authContext);

  await db
    .delete(vendorTasks)
    .where(and(eq(vendorTasks.id, taskId), eq(vendorTasks.eventId, eventId)));

  return { success: true };
}
