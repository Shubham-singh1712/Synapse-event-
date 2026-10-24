import type {
  BudgetItemEntity,
  TimelineMilestoneEntity,
  VendorTaskEntity,
} from "./schemas";

export interface PlanReconciliationResult<T> {
  reconciledItems: T[];
  preservedUserCustomCount: number;
  preservedCompletedCount: number;
  replacedAiItemCount: number;
  addedAiItemCount: number;
  warnings: string[];
}

/**
 * Reconciles current budget items with newly proposed items (e.g. from an AI regeneration).
 * Guarantees that:
 * 1. USER_CUSTOM items are NEVER removed or overwritten.
 * 2. USER_MODIFIED items are protected from being overwritten.
 * 3. COMMITTED or PAID items are NEVER removed or reset to ESTIMATED.
 * 4. Only pure AI_GENERATED, unmodified, non-committed items are updated.
 */
export function reconcileBudgetItems(
  existingItems: BudgetItemEntity[],
  incomingAiItems: BudgetItemEntity[]
): PlanReconciliationResult<BudgetItemEntity> {
  const warnings: string[] = [];
  const preservedItems: BudgetItemEntity[] = [];
  let preservedUserCustomCount = 0;
  let preservedCompletedCount = 0;
  let addedAiItemCount = 0;

  // Set of categories that user explicitly customized
  const userProtectedCategories = new Set<string>();

  for (const item of existingItems) {
    const isCustom = item.isCustomByUser || item.origin === "USER_CUSTOM";
    const isModified = item.origin === "USER_MODIFIED";
    const isCommittedOrPaid = item.status === "COMMITTED" || item.status === "PAID";

    if (isCustom || isModified || isCommittedOrPaid) {
      preservedItems.push(item);
      userProtectedCategories.add(item.category);

      if (isCustom) preservedUserCustomCount++;
      if (isCommittedOrPaid) preservedCompletedCount++;
    }
  }

  // Process incoming AI items
  const reconciledItems: BudgetItemEntity[] = [...preservedItems];

  for (const incoming of incomingAiItems) {
    // Check if an existing AI item in the same category was already preserved as custom/modified
    const existingProtected = preservedItems.find(
      (p) => p.category === incoming.category && p.description === incoming.description
    );

    if (existingProtected) {
      warnings.push(
        `Preserved user-modified budget item "${existingProtected.description}" (${existingProtected.category}). AI suggestion was bypassed.`
      );
      continue;
    }

    // New AI item that doesn't conflict with user customizations
    reconciledItems.push({
      ...incoming,
      origin: "AI_GENERATED",
      isCustomByUser: false,
    });
    addedAiItemCount++;
  }

  const replacedAiItemCount = Math.max(0, existingItems.length - preservedItems.length);

  return {
    reconciledItems,
    preservedUserCustomCount,
    preservedCompletedCount,
    replacedAiItemCount,
    addedAiItemCount,
    warnings,
  };
}

/**
 * Reconciles current timeline milestones with incoming milestones.
 * Guarantees that:
 * 1. COMPLETED milestones NEVER lose completed status or get deleted.
 * 2. USER_CUSTOM milestones are NEVER deleted or overwritten.
 * 3. Only pure AI_GENERATED, incomplete milestones are replaced.
 */
export function reconcileMilestones(
  existingMilestones: TimelineMilestoneEntity[],
  incomingAiMilestones: TimelineMilestoneEntity[]
): PlanReconciliationResult<TimelineMilestoneEntity> {
  const warnings: string[] = [];
  const preservedMilestones: TimelineMilestoneEntity[] = [];
  let preservedUserCustomCount = 0;
  let preservedCompletedCount = 0;
  let addedAiItemCount = 0;

  for (const milestone of existingMilestones) {
    const isCompleted = milestone.status === "COMPLETED";
    const isCustom = milestone.isCustomByUser || milestone.origin === "USER_CUSTOM";
    const isModified = milestone.origin === "USER_MODIFIED";

    if (isCompleted || isCustom || isModified) {
      preservedMilestones.push(milestone);
      if (isCustom) preservedUserCustomCount++;
      if (isCompleted) preservedCompletedCount++;
    }
  }

  const reconciledItems: TimelineMilestoneEntity[] = [...preservedMilestones];

  for (const incoming of incomingAiMilestones) {
    const existingProtected = preservedMilestones.find((p) => p.title === incoming.title);

    if (existingProtected) {
      if (existingProtected.status === "COMPLETED") {
        warnings.push(
          `Protected completed milestone "${existingProtected.title}". Status remains COMPLETED.`
        );
      } else {
        warnings.push(
          `Protected user custom milestone "${existingProtected.title}". Custom schedule preserved.`
        );
      }
      continue;
    }

    reconciledItems.push({
      ...incoming,
      origin: "AI_GENERATED",
      isCustomByUser: false,
    });
    addedAiItemCount++;
  }

  const replacedAiItemCount = Math.max(0, existingMilestones.length - preservedMilestones.length);

  return {
    reconciledItems,
    preservedUserCustomCount,
    preservedCompletedCount,
    replacedAiItemCount,
    addedAiItemCount,
    warnings,
  };
}

/**
 * Reconciles vendor tasks with user preservation guarantees.
 */
export function reconcileVendorTasks(
  existingTasks: VendorTaskEntity[],
  incomingAiTasks: VendorTaskEntity[]
): PlanReconciliationResult<VendorTaskEntity> {
  const warnings: string[] = [];
  const preservedTasks: VendorTaskEntity[] = [];
  let preservedUserCustomCount = 0;
  let preservedCompletedCount = 0;
  let addedAiItemCount = 0;

  for (const task of existingTasks) {
    const isCompleted = task.status === "COMPLETED";
    const isSignedOrPaid =
      task.status === "CONTRACT_SIGNED" || task.status === "DEPOSIT_PAID";
    const isCustom = task.isCustomByUser || task.origin === "USER_CUSTOM";
    const isModified = task.origin === "USER_MODIFIED";

    if (isCompleted || isSignedOrPaid || isCustom || isModified) {
      preservedTasks.push(task);
      if (isCustom) preservedUserCustomCount++;
      if (isCompleted || isSignedOrPaid) preservedCompletedCount++;
    }
  }

  const reconciledItems: VendorTaskEntity[] = [...preservedTasks];

  for (const incoming of incomingAiTasks) {
    const existing = preservedTasks.find(
      (p) => p.category === incoming.category && p.title === incoming.title
    );
    if (existing) {
      warnings.push(`Preserved active vendor contract/task "${existing.title}".`);
      continue;
    }

    reconciledItems.push({
      ...incoming,
      origin: "AI_GENERATED",
      isCustomByUser: false,
    });
    addedAiItemCount++;
  }

  const replacedAiItemCount = Math.max(0, existingTasks.length - preservedTasks.length);

  return {
    reconciledItems,
    preservedUserCustomCount,
    preservedCompletedCount,
    replacedAiItemCount,
    addedAiItemCount,
    warnings,
  };
}
