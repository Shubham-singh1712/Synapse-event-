"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Trash2,
  Edit2,
  PieChart,
  BarChart3,
  Info,
  X,
  Check,
  Wallet,
  ShieldAlert,
} from "lucide-react";
import type { EventEntity, BudgetItemEntity } from "@/lib/domain/schemas";
import {
  formatCentsToCurrency,
  toCents,
} from "@/lib/domain/money";

// Curated luxury celebration palette for categories & stages
const LUXURY_PALETTE = [
  "#342238", // Deep Plum / Aubergine
  "#D97768", // Dusty Coral
  "#C6A66B", // Champagne Gold
  "#694451", // Muted Wine
  "#2A7942", // Forest Emerald
  "#4A5568", // Slate
  "#B45309", // Warm Amber
  "#0284C7", // Sky Blue
  "#7C3AED", // Royal Violet
  "#E11D48", // Crimson Rose
];

import { CELEBRATION_CATEGORIES } from "@/lib/domain/budget";
export { CELEBRATION_CATEGORIES };

interface BudgetLedgerTabProps {
  event: EventEntity;
  budgetItems: BudgetItemEntity[];
  currency: string;
  currencySymbol: string;
  isSaving: boolean;
  onAddItem: (item: {
    category: string;
    description: string;
    estimatedCostCents: number;
    actualCostCents?: number;
    status?: BudgetItemEntity["status"];
    isGuestSensitive?: boolean;
  }) => Promise<void>;
  onUpdateItem: (
    itemId: string,
    updates: {
      description?: string;
      category?: string;
      estimatedCostCents?: number;
      actualCostCents?: number;
      status?: BudgetItemEntity["status"];
    }
  ) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  showFeedback: (type: "success" | "error", message: string) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  onOpenCopilotWithPrompt?: (prompt: string) => void;
}

export function BudgetLedgerTab({
  event,
  budgetItems,
  currency,
  currencySymbol,
  isSaving,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  showFeedback,
  showAddModal,
  setShowAddModal,
  onOpenCopilotWithPrompt,
}: BudgetLedgerTabProps) {
  // ---------------------------------------------------------------------------
  // LEDGER FILTER & SORT STATE
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ESTIMATED" | "QUOTED" | "COMMITTED" | "PAID"
  >("ALL");
  const [sortOption, setSortOption] = useState<
    "AMOUNT_DESC" | "AMOUNT_ASC" | "CATEGORY" | "NAME" | "STATUS"
  >("AMOUNT_DESC");

  // Chart measure view switcher
  const [chartMeasure, setChartMeasure] = useState<
    "PLANNED" | "COMMITTED" | "PAID"
  >("PLANNED");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editEstMajor, setEditEstMajor] = useState("");
  const [editActMajor, setEditActMajor] = useState("");
  const [editStatus, setEditStatus] =
    useState<BudgetItemEntity["status"]>("ESTIMATED");

  // Deletion Confirmation state
  const [itemToDelete, setItemToDelete] = useState<BudgetItemEntity | null>(
    null
  );

  // Add Item Modal form state
  const [newCategory, setNewCategory] = useState("Venue & Mandap");
  const [customCategory, setCustomCategory] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEstMajor, setNewEstMajor] = useState("");
  const [newActMajor, setNewActMajor] = useState("");
  const [newStatus, setNewStatus] =
    useState<BudgetItemEntity["status"]>("ESTIMATED");
  const [newIsGuestSensitive, setNewIsGuestSensitive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // PURE DETERMINISTIC CALCULATIONS & DOMAIN METRICS
  // ---------------------------------------------------------------------------
  const activeItems = useMemo(
    () => budgetItems.filter((i) => i.status !== "CANCELLED"),
    [budgetItems]
  );

  // Stage aggregates (explicit accounting: zero double counting)
  const stageStats = useMemo(() => {
    let estimatedSum = 0;
    let quotedSum = 0;
    let committedSum = 0;
    let paidSum = 0;

    let estimatedCount = 0;
    let quotedCount = 0;
    let committedCount = 0;
    let paidCount = 0;

    for (const item of activeItems) {
      if (item.status === "ESTIMATED") {
        estimatedSum += item.estimatedCostCents;
        estimatedCount++;
      } else if (item.status === "QUOTED") {
        quotedSum += item.quotedCostCents ?? item.estimatedCostCents;
        quotedCount++;
      } else if (item.status === "COMMITTED") {
        committedSum += item.estimatedCostCents;
        committedCount++;
      } else if (item.status === "PAID") {
        // Disbursed funds: prefer actualCostCents, fallback to paidAmountCents or estimatedCostCents
        paidSum +=
          item.actualCostCents > 0
            ? item.actualCostCents
            : item.paidAmountCents ?? item.estimatedCostCents;
        paidCount++;
      }
    }

    return {
      estimated: { sum: estimatedSum, count: estimatedCount },
      quoted: { sum: quotedSum, count: quotedCount },
      committed: { sum: committedSum, count: committedCount },
      paid: { sum: paidSum, count: paidCount },
    };
  }, [activeItems]);

  // Total planned estimates across all active items
  const totalPlannedAllocationsCents = useMemo(
    () => activeItems.reduce((acc, i) => acc + (i.estimatedCostCents || 0), 0),
    [activeItems]
  );

  // Target Budget vs Allocations
  const targetBudgetCents = event.totalBudgetCents;
  const unallocatedBalanceCents =
    targetBudgetCents - totalPlannedAllocationsCents;
  const isOverAllocated = totalPlannedAllocationsCents > targetBudgetCents;
  const isFullyAllocated =
    targetBudgetCents > 0 && totalPlannedAllocationsCents === targetBudgetCents;
  const overrunCents = isOverAllocated
    ? totalPlannedAllocationsCents - targetBudgetCents
    : 0;

  // Available unique categories for filtering
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    activeItems.forEach((i) => {
      if (i.category?.trim()) set.add(i.category.trim());
    });
    return Array.from(set).sort();
  }, [activeItems]);

  // ---------------------------------------------------------------------------
  // DONUT CHART DATA PREPARATION
  // ---------------------------------------------------------------------------
  const donutData = useMemo(() => {
    // Map categories by selected measure
    const map: Record<string, number> = {};

    activeItems.forEach((item) => {
      const cat = item.category?.trim() || "Miscellaneous";
      let amount = 0;

      if (chartMeasure === "PLANNED") {
        amount = item.estimatedCostCents || 0;
      } else if (chartMeasure === "COMMITTED") {
        if (item.status === "COMMITTED") {
          amount = item.estimatedCostCents || 0;
        }
      } else if (chartMeasure === "PAID") {
        if (item.status === "PAID") {
          amount =
            item.actualCostCents > 0
              ? item.actualCostCents
              : item.paidAmountCents ?? item.estimatedCostCents;
        }
      }

      if (amount > 0) {
        map[cat] = (map[cat] || 0) + amount;
      }
    });

    const total = Object.values(map).reduce((sum, v) => sum + v, 0);

    const slices = Object.entries(map)
      .map(([category, cents], index) => ({
        category,
        cents,
        percentage:
          total > 0 ? Math.round((cents / total) * 1000) / 10 : 0,
        color: LUXURY_PALETTE[index % LUXURY_PALETTE.length],
      }))
      .sort((a, b) => b.cents - a.cents);

    // Compute SVG arcs
    let currentAngle = -90; // Start at 12 o'clock
    const arcSlices = slices.map((item) => {
      const sliceAngle = (item.cents / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle += sliceAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Outer radius: 82, Inner radius: 52, Center: 100, 100
      const x1 = 100 + 82 * Math.cos(startRad);
      const y1 = 100 + 82 * Math.sin(startRad);
      const x2 = 100 + 82 * Math.cos(endRad);
      const y2 = 100 + 82 * Math.sin(endRad);

      const x3 = 100 + 52 * Math.cos(endRad);
      const y3 = 100 + 52 * Math.sin(endRad);
      const x4 = 100 + 52 * Math.cos(startRad);
      const y4 = 100 + 52 * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;
      const pathData = `M ${x1} ${y1} A 82 82 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 52 52 0 ${largeArc} 0 ${x4} ${y4} Z`;

      return {
        ...item,
        pathData,
      };
    });

    return { total, slices: arcSlices };
  }, [activeItems, chartMeasure]);

  // ---------------------------------------------------------------------------
  // CATEGORY HORIZONTAL BARS DATA
  // ---------------------------------------------------------------------------
  const categoryBarsData = useMemo(() => {
    const catMap: Record<
      string,
      {
        plannedCents: number;
        quotedCents: number;
        committedCents: number;
        paidCents: number;
        itemCount: number;
      }
    > = {};

    activeItems.forEach((item) => {
      const cat = item.category?.trim() || "Miscellaneous";
      if (!catMap[cat]) {
        catMap[cat] = {
          plannedCents: 0,
          quotedCents: 0,
          committedCents: 0,
          paidCents: 0,
          itemCount: 0,
        };
      }
      catMap[cat].itemCount += 1;
      catMap[cat].plannedCents += item.estimatedCostCents || 0;

      if (item.status === "QUOTED") {
        catMap[cat].quotedCents +=
          item.quotedCostCents ?? item.estimatedCostCents;
      } else if (item.status === "COMMITTED") {
        catMap[cat].committedCents += item.estimatedCostCents;
      } else if (item.status === "PAID") {
        catMap[cat].paidCents +=
          item.actualCostCents > 0
            ? item.actualCostCents
            : item.paidAmountCents ?? item.estimatedCostCents;
      }
    });

    const denominator =
      targetBudgetCents > 0 ? targetBudgetCents : totalPlannedAllocationsCents;

    return Object.entries(catMap)
      .map(([category, stats], idx) => {
        const percentOfBudget =
          denominator > 0
            ? Math.round((stats.plannedCents / denominator) * 1000) / 10
            : 0;

        return {
          category,
          color: LUXURY_PALETTE[idx % LUXURY_PALETTE.length],
          ...stats,
          percentOfBudget,
        };
      })
      .sort((a, b) => b.plannedCents - a.plannedCents);
  }, [activeItems, targetBudgetCents, totalPlannedAllocationsCents]);

  // ---------------------------------------------------------------------------
  // FILTERED & SORTED LEDGER ENTRIES
  // ---------------------------------------------------------------------------
  const filteredAndSortedEntries = useMemo(() => {
    let result = [...budgetItems];

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((i) => i.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "ALL") {
      result = result.filter(
        (i) => i.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Search query filter (matches description or category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.description?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === "AMOUNT_DESC") {
        return (b.estimatedCostCents || 0) - (a.estimatedCostCents || 0);
      }
      if (sortOption === "AMOUNT_ASC") {
        return (a.estimatedCostCents || 0) - (b.estimatedCostCents || 0);
      }
      if (sortOption === "CATEGORY") {
        return (a.category || "").localeCompare(b.category || "");
      }
      if (sortOption === "NAME") {
        return (a.description || "").localeCompare(b.description || "");
      }
      if (sortOption === "STATUS") {
        return (a.status || "").localeCompare(b.status || "");
      }
      return 0;
    });

    return result;
  }, [budgetItems, statusFilter, categoryFilter, searchQuery, sortOption]);

  const filteredTotalCents = useMemo(
    () =>
      filteredAndSortedEntries.reduce(
        (acc, i) => acc + (i.estimatedCostCents || 0),
        0
      ),
    [filteredAndSortedEntries]
  );

  // ---------------------------------------------------------------------------
  // SMART FACTUAL INSIGHTS (DERIVED STRICTLY FROM REAL ARITHMETIC)
  // ---------------------------------------------------------------------------
  const smartInsights = useMemo(() => {
    const list: {
      type: "neutral" | "warning" | "success" | "info";
      text: string;
      subtext?: string;
    }[] = [];

    // 1. Allocation status insight
    if (targetBudgetCents > 0) {
      if (isOverAllocated) {
        list.push({
          type: "warning",
          text: `Target budget is exceeded by ${formatCentsToCurrency(
            overrunCents,
            currency
          )} (${Math.round((overrunCents / targetBudgetCents) * 100)}% over).`,
          subtext:
            "Consider reviewing uncommitted line items or adjusting target allocation.",
        });
      } else if (isFullyAllocated) {
        list.push({
          type: "success",
          text: `Budget is 100% allocated across all ${activeItems.length} line items.`,
          subtext: "Every rupee of the target budget has been assigned to a category.",
        });
      } else if (unallocatedBalanceCents > 0) {
        list.push({
          type: "info",
          text: `${formatCentsToCurrency(
            unallocatedBalanceCents,
            currency
          )} remains unallocated for contingencies and vendor revisions.`,
          subtext: `${
            Math.round((unallocatedBalanceCents / targetBudgetCents) * 100)
          }% of planned capacity is currently unassigned.`,
        });
      }
    }

    // 2. Top category concentration
    if (categoryBarsData.length > 0 && totalPlannedAllocationsCents > 0) {
      const top = categoryBarsData[0];
      const pct = Math.round(
        (top.plannedCents / totalPlannedAllocationsCents) * 100
      );
      if (pct >= 25) {
        list.push({
          type: "neutral",
          text: `${top.category} represents ${pct}% of total planned allocations (${formatCentsToCurrency(
            top.plannedCents,
            currency
          )}).`,
          subtext: `${top.itemCount} line item${
            top.itemCount > 1 ? "s" : ""
          } in this category.`,
        });
      }
    }

    // 3. Payment settlement status
    if (stageStats.paid.sum === 0 && activeItems.length > 0) {
      list.push({
        type: "neutral",
        text: "No payments or disbursements have been recorded yet.",
        subtext: "Update line items to PAID once vendor advances are settled.",
      });
    } else if (stageStats.committed.sum > 0) {
      const settledRatio =
        stageStats.paid.sum > 0
          ? Math.round(
              (stageStats.paid.sum /
                (stageStats.committed.sum + stageStats.paid.sum)) *
                100
            )
          : 0;
      list.push({
        type: "info",
        text: `${formatCentsToCurrency(
          stageStats.committed.sum,
          currency
        )} in active contracts committed, with ${formatCentsToCurrency(
          stageStats.paid.sum,
          currency
        )} (${settledRatio}%) settled.`,
      });
    }

    return list;
  }, [
    targetBudgetCents,
    isOverAllocated,
    isFullyAllocated,
    overrunCents,
    unallocatedBalanceCents,
    currency,
    categoryBarsData,
    totalPlannedAllocationsCents,
    stageStats,
    activeItems.length,
  ]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleStartEdit = (item: BudgetItemEntity) => {
    setEditingItemId(item.id);
    setEditDesc(item.description);
    setEditCategory(item.category || "General");
    setEditEstMajor((item.estimatedCostCents / 100).toString());
    setEditActMajor((item.actualCostCents / 100).toString());
    setEditStatus(item.status);
  };

  const handleSaveEdit = async (itemId: string) => {
    const est = parseFloat(editEstMajor);
    const act = parseFloat(editActMajor || "0");

    if (isNaN(est) || est < 0) {
      showFeedback("error", "Estimated amount must be a positive number.");
      return;
    }
    if (isNaN(act) || act < 0) {
      showFeedback("error", "Actual/paid amount must be a non-negative number.");
      return;
    }
    if (!editDesc.trim()) {
      showFeedback("error", "Description cannot be empty.");
      return;
    }

    try {
      const estimatedCostCents = toCents(est);
      const actualCostCents = toCents(act);

      await onUpdateItem(itemId, {
        description: editDesc.trim(),
        category: editCategory.trim() || "General",
        estimatedCostCents,
        actualCostCents,
        status: editStatus,
      });

      setEditingItemId(null);
    } catch {
      // Error feedback is handled in parent
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const desc = newDesc.trim();
    if (!desc) {
      setFormError("Please enter an item description.");
      return;
    }

    const estNum = parseFloat(newEstMajor);
    if (isNaN(estNum) || estNum < 0) {
      setFormError("Estimated cost must be a valid positive number.");
      return;
    }

    const actNum = newActMajor ? parseFloat(newActMajor) : 0;
    if (isNaN(actNum) || actNum < 0) {
      setFormError("Actual cost must be a non-negative number.");
      return;
    }

    const categoryToUse =
      newCategory === "Custom..."
        ? customCategory.trim() || "Miscellaneous"
        : newCategory;

    try {
      const estimatedCostCents = toCents(estNum);
      const actualCostCents = toCents(actNum);

      await onAddItem({
        category: categoryToUse,
        description: desc,
        estimatedCostCents,
        actualCostCents,
        status: newStatus,
        isGuestSensitive: newIsGuestSensitive,
      });

      // Reset form upon success
      setNewDesc("");
      setNewEstMajor("");
      setNewActMajor("");
      setCustomCategory("");
      setNewStatus("ESTIMATED");
      setNewIsGuestSensitive(false);
      setShowAddModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to add budget entry."
      );
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    } catch {
      // Handled in parent
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: BudgetItemEntity["status"]) => {
    switch (status) {
      case "ESTIMATED":
        return {
          label: "Estimated",
          classes:
            "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
          icon: Clock,
        };
      case "QUOTED":
        return {
          label: "Quoted",
          classes:
            "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30",
          icon: FileText,
        };
      case "COMMITTED":
        return {
          label: "Committed",
          classes:
            "bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30",
          icon: CheckCircle2,
        };
      case "PAID":
        return {
          label: "Paid / Settled",
          classes:
            "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
          icon: Wallet,
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          classes:
            "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/30",
          icon: X,
        };
      default:
        return {
          label: status,
          classes: "bg-surface text-muted border-border",
          icon: Info,
        };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* =========================================================================
          1. HEADER & PRIMARY ACTION
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-sans uppercase tracking-[0.2em] text-champagne dark:text-champagne-light font-medium">
              Financial Atelier &middot; Ledger
            </span>
            <span className="text-muted text-[10px] font-mono">
              ({activeItems.length} Active Items)
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-primary tracking-tight">
            Itemized Budget Ledger
          </h2>
          <p className="text-xs text-muted mt-1 max-w-2xl leading-relaxed">
            Strict integer minor-unit accounting in {currency}. Distinguish
            between early planning envelopes, vendor quotations, confirmed
            contracts, and settled cash disbursements without double counting.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-aubergine hover:bg-aubergine-dark dark:bg-champagne dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs transition shadow-subtle shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Budget Entry</span>
        </button>
      </div>

      {/* =========================================================================
          2. PROMINENT BUDGET OVERVIEW (EDITORIAL CARPET)
         ========================================================================= */}
      <section
        aria-label="Budget Overview"
        className="rounded-2xl p-6 sm:p-7 bg-surface/90 border border-border/80 shadow-subtle relative overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center" role="region" aria-live="polite" aria-atomic="true">
          {/* Target Budget & Allocation Balance */}
          <div className="lg:col-span-5 space-y-2 border-b lg:border-b-0 lg:border-r border-border/80 pb-5 lg:pb-0 lg:pr-6">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-muted block">
              Planned Target Budget
            </span>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-serif text-3xl sm:text-4xl font-normal text-primary tracking-tight tabular-nums">
                {formatCentsToCurrency(targetBudgetCents, currency)}
              </span>
              {isOverAllocated ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30">
                  <AlertCircle className="w-3 h-3" />
                  Over Budget by {formatCentsToCurrency(overrunCents, currency)}
                </span>
              ) : isFullyAllocated ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-champagne/15 text-aubergine dark:text-champagne border border-champagne/40">
                  <Check className="w-3 h-3" />
                  100% Fully Allocated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                  {formatCentsToCurrency(unallocatedBalanceCents, currency)} Available
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted pt-1">
              {isOverAllocated
                ? "Total planned line items exceed the original target ceiling."
                : isFullyAllocated
                ? "The entire celebration target has been assigned to planned categories."
                : `Remaining unallocated balance available for contingencies and vendor revisions.`}
            </p>
          </div>

          {/* 4 Financial Lifecycle Milestones */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 1. Estimates */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-sans uppercase tracking-[0.12em]">
                  Estimates
                </span>
              </div>
              <span className="font-serif text-lg sm:text-xl font-normal text-primary block tabular-nums">
                {formatCentsToCurrency(stageStats.estimated.sum, currency)}
              </span>
              <span className="text-[10px] text-muted block font-mono">
                {stageStats.estimated.count} planning item{stageStats.estimated.count === 1 ? "" : "s"}
              </span>
            </div>

            {/* 2. Quoted */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted">
                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="text-[10px] font-sans uppercase tracking-[0.12em]">
                  Quoted
                </span>
              </div>
              <span className="font-serif text-lg sm:text-xl font-normal text-sky-800 dark:text-sky-300 block tabular-nums">
                {formatCentsToCurrency(stageStats.quoted.sum, currency)}
              </span>
              <span className="text-[10px] text-muted block font-mono">
                {stageStats.quoted.count} proposal{stageStats.quoted.count === 1 ? "" : "s"}
              </span>
            </div>

            {/* 3. Committed */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="text-[10px] font-sans uppercase tracking-[0.12em]">
                  Committed
                </span>
              </div>
              <span className="font-serif text-lg sm:text-xl font-normal text-purple-800 dark:text-purple-300 block tabular-nums">
                {formatCentsToCurrency(stageStats.committed.sum, currency)}
              </span>
              <span className="text-[10px] text-muted block font-mono">
                {stageStats.committed.count} contract{stageStats.committed.count === 1 ? "" : "s"}
              </span>
            </div>

            {/* 4. Paid */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-sans uppercase tracking-[0.12em]">
                  Disbursed
                </span>
              </div>
              <span className="font-serif text-lg sm:text-xl font-normal text-emerald-800 dark:text-emerald-300 block tabular-nums">
                {formatCentsToCurrency(stageStats.paid.sum, currency)}
              </span>
              <span className="text-[10px] text-muted block font-mono">
                {stageStats.paid.count} settled
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2B. AI CELEBRATION BUDGET ADVISOR (Phase 6 Integration)
         ========================================================================= */}
      <section
        aria-label="AI Budget Advisor"
        className="rounded-2xl p-5 bg-gradient-to-r from-aubergine/5 via-champagne/10 to-coral/5 dark:from-white/5 dark:via-champagne/5 dark:to-transparent border border-champagne/30 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-coral" />
            <span className="font-serif text-sm font-medium text-primary">
              AI Budget Advisor &amp; Allocation Insights
            </span>
          </div>
          <p className="text-xs text-muted max-w-2xl leading-relaxed">
            {isOverAllocated
              ? `Your planned allocations exceed target budget by ${formatCentsToCurrency(overrunCents, currency)}. Ask Copilot to identify cost-saving trade-offs.`
              : isFullyAllocated
              ? `Your budget is 100% committed with zero contingency margin. Ask Copilot to suggest reserve protections.`
              : `You have ${formatCentsToCurrency(unallocatedBalanceCents, currency)} (${Math.round((unallocatedBalanceCents / (targetBudgetCents || 1)) * 100)}%) in safe reserve. Ask Copilot how to balance allocations.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenCopilotWithPrompt) {
              onOpenCopilotWithPrompt(
                `Analyze my budget of ${formatCentsToCurrency(targetBudgetCents, currency)}: currently ${formatCentsToCurrency(totalPlannedAllocationsCents, currency)} is allocated with ${formatCentsToCurrency(unallocatedBalanceCents, currency)} buffer. What trade-offs or cost adjustments do you suggest?`
              );
            }
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-champagne/50 hover:border-champagne text-primary text-xs font-serif font-medium transition shadow-subtle shrink-0 hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-coral" />
          <span>Ask AI Budget Advisor</span>
        </button>
      </section>

      {/* =========================================================================
          3. VISUALIZATION STUDIO: DONUT CHART & CATEGORY PROGRESS BARS
         ========================================================================= */}
      <section
        aria-label="Category Distribution & Lifecycle Breakdown"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* DONUT CHART (5 Cols on LG) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-surface/80 border border-border/80 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-champagne" />
                <h3 className="font-serif text-base font-normal text-primary">
                  Category Distribution
                </h3>
              </div>

              {/* Measure Switcher */}
              <div className="flex items-center p-0.5 rounded-lg bg-page border border-border/80 text-[10px]">
                <button
                  type="button"
                  onClick={() => setChartMeasure("PLANNED")}
                  className={`px-2 py-1 rounded-md transition font-medium ${
                    chartMeasure === "PLANNED"
                      ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine shadow-xs"
                      : "text-muted hover:text-primary"
                  }`}
                >
                  Planned
                </button>
                <button
                  type="button"
                  onClick={() => setChartMeasure("COMMITTED")}
                  className={`px-2 py-1 rounded-md transition font-medium ${
                    chartMeasure === "COMMITTED"
                      ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine shadow-xs"
                      : "text-muted hover:text-primary"
                  }`}
                >
                  Booked
                </button>
                <button
                  type="button"
                  onClick={() => setChartMeasure("PAID")}
                  className={`px-2 py-1 rounded-md transition font-medium ${
                    chartMeasure === "PAID"
                      ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine shadow-xs"
                      : "text-muted hover:text-primary"
                  }`}
                >
                  Settled
                </button>
              </div>
            </div>

            {/* SVG Donut Canvas */}
            {donutData.total === 0 ? (
              <div className="py-14 text-center space-y-2">
                <PieChart className="w-8 h-8 text-muted/40 mx-auto stroke-[1.2]" />
                <p className="text-xs text-muted font-medium">
                  {chartMeasure === "PLANNED"
                    ? "No planned budget items found."
                    : chartMeasure === "COMMITTED"
                    ? "No confirmed commitments recorded yet."
                    : "No settled disbursements recorded yet."}
                </p>
                <p className="text-[11px] text-muted/80 max-w-xs mx-auto">
                  {chartMeasure === "PLANNED"
                    ? "Add line items to view proportional category allocation."
                    : "Transition vendor quotes or estimates to this status to visualize actual contracts."}
                </p>
              </div>
            ) : (
              <div className="pt-4 flex flex-col items-center">
                <div className="relative w-48 h-48 sm:w-52 sm:h-52">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full transform -rotate-90 filter drop-shadow-xs"
                    role="img"
                    aria-label="Category allocation donut chart"
                  >
                    {donutData.slices.map((slice) => {
                      const isHovered = hoveredSlice === slice.category;
                      return (
                        <path
                          key={slice.category}
                          d={slice.pathData}
                          fill={slice.color}
                          className="transition-all duration-200 cursor-pointer hover:opacity-90"
                          style={{
                            transform: isHovered ? "scale(1.02)" : "scale(1)",
                            transformOrigin: "100px 100px",
                          }}
                          onMouseEnter={() => setHoveredSlice(slice.category)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        >
                          <title>{`${slice.category}: ${formatCentsToCurrency(
                            slice.cents,
                            currency
                          )} (${slice.percentage}%)`}</title>
                        </path>
                      );
                    })}
                  </svg>

                  {/* Donut Center Info */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                    <span className="text-[10px] font-sans uppercase tracking-[0.15em] text-muted block">
                      {chartMeasure === "PLANNED"
                        ? "Total Allocation"
                        : chartMeasure === "COMMITTED"
                        ? "Total Booked"
                        : "Total Settled"}
                    </span>
                    <span className="font-serif text-lg sm:text-xl font-normal text-primary tracking-tight block tabular-nums">
                      {formatCentsToCurrency(donutData.total, currency)}
                    </span>
                    <span className="text-[10px] text-muted block font-mono mt-0.5">
                      {donutData.slices.length} Categories
                    </span>
                  </div>
                </div>

                {/* Compact Interactive Legend */}
                <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
                  {donutData.slices.slice(0, 6).map((slice) => {
                    const isHovered = hoveredSlice === slice.category;
                    return (
                      <div
                        key={slice.category}
                        onMouseEnter={() => setHoveredSlice(slice.category)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={`flex items-center justify-between p-1.5 rounded-lg transition cursor-default ${
                          isHovered ? "bg-surface-elevated shadow-xs" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="text-[11px] text-primary truncate">
                            {slice.category}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted font-mono shrink-0 ml-1">
                          {slice.percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-muted/80 text-center pt-3 border-t border-border/40 mt-3">
            Showing distribution for {chartMeasure.toLowerCase()} expenditure
            across active line items.
          </div>
        </div>

        {/* CATEGORY PROGRESS BARS (7 Cols on LG) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-surface/80 border border-border/80 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-champagne" />
                <h3 className="font-serif text-base font-normal text-primary">
                  Category Progress &amp; Allocations
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted">
                Denominator: {targetBudgetCents > 0 ? "Target Budget" : "Total Estimates"}
              </span>
            </div>

            {categoryBarsData.length === 0 ? (
              <div className="py-14 text-center text-xs text-muted">
                No active categories found in the ledger.
              </div>
            ) : (
              <div className="space-y-3.5 pt-4">
                {categoryBarsData.map((cat) => (
                  <div key={cat.category} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-primary text-[12px]">
                          {cat.category}
                        </span>
                        <span className="text-[10px] text-muted font-mono">
                          ({cat.itemCount})
                        </span>
                      </div>
                      <div className="text-right flex items-baseline gap-2">
                        <span className="font-serif text-sm text-primary tabular-nums">
                          {formatCentsToCurrency(cat.plannedCents, currency)}
                        </span>
                        <span className="text-[10px] text-muted font-mono">
                          {cat.percentOfBudget}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, cat.percentOfBudget)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>

                    {/* Micro lifecycle indicators for this category */}
                    {(cat.committedCents > 0 || cat.paidCents > 0 || cat.quotedCents > 0) && (
                      <div className="flex items-center gap-3 text-[10px] text-muted font-mono pt-0.5">
                        {cat.committedCents > 0 && (
                          <span className="text-purple-700 dark:text-purple-300">
                            Booked: {formatCentsToCurrency(cat.committedCents, currency)}
                          </span>
                        )}
                        {cat.paidCents > 0 && (
                          <span className="text-emerald-700 dark:text-emerald-300">
                            Paid: {formatCentsToCurrency(cat.paidCents, currency)}
                          </span>
                        )}
                        {cat.quotedCents > 0 && (
                          <span className="text-sky-700 dark:text-sky-300">
                            Quoted: {formatCentsToCurrency(cat.quotedCents, currency)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted/80 pt-4 border-t border-border/40 mt-4">
            Category percentages reflect planned commitments relative to your
            total budget envelope.
          </p>
        </div>
      </section>

      {/* =========================================================================
          4. SMART FACTUAL INSIGHTS
         ========================================================================= */}
      {smartInsights.length > 0 && (
        <section
          aria-label="Budget Insights"
          className="rounded-2xl p-5 bg-surface/60 border border-champagne/30 shadow-subtle space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-sans text-champagne font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="tracking-wide uppercase text-[10px] tracking-[0.15em]">
              Factual Ledger Insights
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {smartInsights.map((ins, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-surface border border-border/60 space-y-1"
              >
                <p className="text-primary font-medium leading-snug">
                  {ins.text}
                </p>
                {ins.subtext && (
                  <p className="text-muted text-[11px] leading-relaxed">
                    {ins.subtext}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          5. ITEMIZED LEDGER WORKBENCH (SEARCH, FILTER, SORT, ROWS)
         ========================================================================= */}
      <section
        aria-label="Itemized Entries Table"
        className="rounded-2xl bg-surface/90 border border-border/80 shadow-subtle overflow-hidden space-y-4 p-5 sm:p-6"
      >
        {/* Controls Toolbar: Search, Category, Status, Sort */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs pb-3 border-b border-border/70">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search line item description or category..."
              className="w-full bg-page border border-border rounded-xl pl-9 pr-3 py-2 text-primary focus:outline-none focus:border-champagne placeholder:text-muted/60 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown & Sort Dropdown */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 bg-page border border-border rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3 h-3 text-champagne" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-primary focus:outline-none text-xs cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-page border border-border rounded-xl px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3 h-3 text-champagne" />
              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(
                    e.target.value as
                      | "AMOUNT_DESC"
                      | "AMOUNT_ASC"
                      | "CATEGORY"
                      | "NAME"
                      | "STATUS"
                  )
                }
                className="bg-transparent text-primary focus:outline-none text-xs cursor-pointer"
              >
                <option value="AMOUNT_DESC">Highest Amount</option>
                <option value="AMOUNT_ASC">Lowest Amount</option>
                <option value="CATEGORY">Category (A-Z)</option>
                <option value="NAME">Description (A-Z)</option>
                <option value="STATUS">Lifecycle Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs Strip */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div
            className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar select-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {(
              [
                { key: "ALL", label: "All Items", count: activeItems.length },
                {
                  key: "ESTIMATED",
                  label: "Estimates",
                  count: stageStats.estimated.count,
                },
                {
                  key: "QUOTED",
                  label: "Quoted",
                  count: stageStats.quoted.count,
                },
                {
                  key: "COMMITTED",
                  label: "Committed",
                  count: stageStats.committed.count,
                },
                { key: "PAID", label: "Paid", count: stageStats.paid.count },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer font-medium ${
                  statusFilter === tab.key
                    ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine shadow-xs"
                    : "bg-surface text-secondary hover:text-primary border border-border/60"
                }`}
              >
                {tab.label} &middot; {tab.count}
              </button>
            ))}
          </div>

          {/* Filtered Counter Summary */}
          <div className="text-[11px] text-muted font-mono">
            Showing {filteredAndSortedEntries.length} of {budgetItems.length}{" "}
            entries &middot; Filtered Total:{" "}
            <span className="font-serif font-normal text-primary">
              {formatCentsToCurrency(filteredTotalCents, currency)}
            </span>
          </div>
        </div>

        {/* Ledger Entries List */}
        {filteredAndSortedEntries.length === 0 ? (
          <div className="py-14 text-center space-y-2 border border-dashed border-border/80 rounded-xl">
            <Receipt className="w-8 h-8 text-muted/40 mx-auto" />
            <p className="text-sm text-primary font-medium">
              No matching ledger entries
            </p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try adjusting or resetting your search keywords and status filters."
                : "Your ledger is currently empty. Click 'Add Budget Entry' above to add your first expense."}
            </p>
            {(searchQuery ||
              categoryFilter !== "ALL" ||
              statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-champagne text-xs text-secondary transition"
              >
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            {filteredAndSortedEntries.map((item) => {
              const badge = getStatusBadge(item.status);
              const BadgeIcon = badge.icon;
              const isEditing = editingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-surface/75 border border-border/80 hover:border-champagne/40 shadow-subtle transition"
                >
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-5">
                          <label className="text-muted block mb-1 font-medium">
                            Description
                          </label>
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                            placeholder="Line item description"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-muted block mb-1 font-medium">
                            Category
                          </label>
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                            placeholder="Category"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-muted block mb-1 font-medium">
                            Estimated ({currencySymbol})
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editEstMajor}
                            onChange={(e) => setEditEstMajor(e.target.value)}
                            className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-muted block mb-1 font-medium">
                            Paid / Settled ({currencySymbol})
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editActMajor}
                            onChange={(e) => setEditActMajor(e.target.value)}
                            className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <div className="flex items-center gap-2 text-xs">
                          <label className="text-muted font-medium">
                            Lifecycle Status:
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) =>
                              setEditStatus(
                                e.target.value as BudgetItemEntity["status"]
                              )
                            }
                            className="bg-page border border-border rounded-lg px-2.5 py-1 text-primary text-xs"
                          >
                            <option value="ESTIMATED">ESTIMATED</option>
                            <option value="QUOTED">QUOTED</option>
                            <option value="COMMITTED">COMMITTED</option>
                            <option value="PAID">PAID</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={isSaving}
                            className="px-4 py-1.5 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine font-medium text-xs shadow-subtle transition cursor-pointer"
                          >
                            {isSaving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-base font-normal text-primary">
                            {item.description}
                          </span>

                          {/* Status Pill */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider border ${badge.classes}`}
                          >
                            <BadgeIcon className="w-2.5 h-2.5" />
                            {badge.label}
                          </span>

                          {item.isGuestSensitive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-champagne/15 text-secondary border border-champagne/30">
                              Guest-Scaled
                            </span>
                          )}

                          {item.isCustomByUser && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-aubergine/10 dark:bg-champagne/15 text-aubergine dark:text-champagne border border-aubergine/20">
                              Custom Entry
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted font-mono">
                          <span>Category: {item.category}</span>
                          {item.actualCostCents > 0 && (
                            <span className="text-emerald-700 dark:text-emerald-300">
                              Disbursed:{" "}
                              {formatCentsToCurrency(
                                item.actualCostCents,
                                currency
                              )}
                            </span>
                          )}
                          {item.quotedCostCents && item.quotedCostCents > 0 && (
                            <span className="text-sky-700 dark:text-sky-300">
                              Quote:{" "}
                              {formatCentsToCurrency(
                                item.quotedCostCents,
                                currency
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Monetary Amount & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        <div className="text-right">
                          <span className="font-serif text-base font-normal text-primary block tabular-nums">
                            {formatCentsToCurrency(
                              item.estimatedCostCents,
                              currency
                            )}
                          </span>
                          <span className="text-[10px] text-muted block font-mono">
                            {item.status === "PAID"
                              ? "Settled Amount"
                              : "Planning Allocation"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
                            title="Edit Item"
                            aria-label={`Edit ${item.description}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-surface-elevated transition cursor-pointer"
                            title="Delete Item"
                            aria-label={`Delete ${item.description}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          6. ADD BUDGET ENTRY MODAL
         ========================================================================= */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-xl bg-surface border border-champagne/40 rounded-2xl p-6 sm:p-7 shadow-card space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-champagne block font-medium mb-0.5">
                  New Ledger Item
                </span>
                <h3 className="font-serif text-xl font-normal text-primary">
                  Add Custom Budget Entry
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                }}
                className="p-1 rounded-lg text-muted hover:text-primary transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Category Selection */}
                <div>
                  <label className="text-secondary font-medium block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                  >
                    {CELEBRATION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Custom...">+ Custom Category...</option>
                  </select>
                </div>

                {/* Custom Category Input if selected */}
                {newCategory === "Custom..." && (
                  <div>
                    <label className="text-secondary font-medium block mb-1">
                      Custom Category Name
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Sangeet Choreography"
                      className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                      required
                    />
                  </div>
                )}

                {/* Lifecycle Status */}
                <div>
                  <label className="text-secondary font-medium block mb-1">
                    Initial Financial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(
                        e.target.value as BudgetItemEntity["status"]
                      )
                    }
                    className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                  >
                    <option value="ESTIMATED">ESTIMATED (Early Planning)</option>
                    <option value="QUOTED">QUOTED (Vendor Proposal)</option>
                    <option value="COMMITTED">COMMITTED (Booked Contract)</option>
                    <option value="PAID">PAID (Settled Disbursement)</option>
                  </select>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="text-secondary font-medium block mb-1">
                    Item Description
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Royal Mughal Floral Mandap & Entryway Arch"
                    className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                    required
                  />
                </div>

                {/* Estimated Cost */}
                <div>
                  <label className="text-secondary font-medium block mb-1">
                    Estimated Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newEstMajor}
                    onChange={(e) => setNewEstMajor(e.target.value)}
                    placeholder="0"
                    className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                    required
                  />
                </div>

                {/* Actual / Paid Cost (if applicable) */}
                <div>
                  <label className="text-secondary font-medium block mb-1">
                    Settled / Disbursed Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newActMajor}
                    onChange={(e) => setNewActMajor(e.target.value)}
                    placeholder="Optional (if advance paid)"
                    className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                  />
                </div>
              </div>

              {/* Guest Sensitive Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsGuestSensitive}
                    onChange={(e) => setNewIsGuestSensitive(e.target.checked)}
                    className="rounded border-border text-coral focus:ring-coral"
                  />
                  <span>
                    Guest-sensitive (scales automatically in Plan Adjustments when guest count changes)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-muted hover:text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-aubergine hover:bg-aubergine-dark dark:bg-champagne dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs shadow-subtle transition cursor-pointer"
                >
                  {isSaving ? "Persisting..." : "Add to Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. DELETION CONFIRMATION MODAL
         ========================================================================= */}
      {itemToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-md bg-surface border border-red-500/30 rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-lg font-normal text-primary">
                Confirm Deletion
              </h3>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-primary font-medium">
                &ldquo;{itemToDelete.description}&rdquo;
              </strong>{" "}
              ({formatCentsToCurrency(itemToDelete.estimatedCostCents, currency)})
              from the budget ledger? This will permanently remove the item and
              recalculate all financial totals.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition cursor-pointer"
              >
                Keep Item
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-subtle transition cursor-pointer"
              >
                {isSaving ? "Deleting..." : "Delete from Ledger"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
