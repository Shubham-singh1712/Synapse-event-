"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  Users,
  MapPin,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Sliders,
  Heart,
  PartyPopper,
  Flag,
  CheckSquare,
  Briefcase,
  Settings2,
  X,
  Receipt,
  LayoutDashboard,
  CheckCircle2,
  Kanban,
  List,
  PieChart,
  AlertCircle,
  ArrowRight,
  Check,
} from "lucide-react";
import { formatCentsToCurrency, toCents } from "@/lib/domain/money";
import { formatIndianDate } from "@/lib/domain/i18n";
import {
  calculateBudgetSummary,
  type BudgetFinancialSummary,
} from "@/lib/domain/budget";
import {
  calculateTimelineSummary,
  type TimelineSummary,
} from "@/lib/domain/timeline";
import {
  calculateGuestCountImpact,
  calculateBudgetChangeImpact,
} from "@/lib/domain/change-impact";
import type { CompleteEventPlan } from "@/lib/services/event-service";
import type {
  BudgetItemEntity,
  TimelineMilestoneEntity,
  VendorTaskEntity,
} from "@/lib/domain/schemas";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { BudgetLedgerTab } from "./BudgetLedgerTab";
import { PlanChecklistTab } from "./PlanChecklistTab";
import { VendorsBookingsTab } from "./VendorsBookingsTab";
import { InspirationStudioTab } from "./InspirationStudioTab";
import { CelebrationCopilotDrawer } from "./CelebrationCopilotDrawer";

interface Props {
  initialPlan: CompleteEventPlan;
  isAuthenticated: boolean;
  backUrl: string;
}

// Color palette for category visualization in charts
const CATEGORY_COLORS = [
  "#342238", // Deep Aubergine
  "#C6A66B", // Champagne
  "#D97768", // Dusty Coral
  "#694451", // Muted Wine
  "#2A7942", // Forest Emerald
  "#4B6584", // Slate Blue
  "#8854D0", // Royal Violet
  "#E58E26", // Warm Amber
  "#0097E6", // Sky Blue
  "#786D76", // Muted Taupe
];

// Contextual Indian Celebration Task Suggestions by Archetype
const CULTURAL_TASK_SUGGESTIONS: Record<
  string,
  { title: string; category: string; requirements: string }[]
> = {
  WEDDING: [
    {
      title: "Mehendi Ceremony Playlist & Dholak Logistics",
      category: "Ceremony & Rituals",
      requirements: "Curate lively Sangeet/Mehendi playlist; book live dholak artist for aunties and cousins.",
    },
    {
      title: "Haldi Ceremony Organic Turmeric Paste & Floral Jewelry",
      category: "Ceremony & Rituals",
      requirements: "Order fresh yellow marigold garlands and customized floral jewelry set for bride.",
    },
    {
      title: "Pandit ji Muhurat & Vedic Puja Samagri List",
      category: "Ceremony & Rituals",
      requirements: "Verify exact phera muhurat timings; arrange dry coconuts, hawan samagri, and gangajal.",
    },
    {
      title: "Mithai Boxes & Dry Fruit Invitation Hampers",
      category: "Family Coordination",
      requirements: "Coordinate distribution to extended family elders, in-laws, and VIP guests.",
    },
    {
      title: "Safa / Pheta (Turban) Specialist for Baraat",
      category: "Wardrobe & Styling",
      requirements: "Book 2 turban tiers for groom's procession at venue entrance (estimated 50 safas).",
    },
    {
      title: "Elderly Family Seating & Wheelchair Accessibility",
      category: "Family Coordination",
      requirements: "Ensure step-free ramp access to mandap and cushioned front-row sofa seating for grandparents.",
    },
  ],
  BIRTHDAY: [
    {
      title: "Custom Themed Cake & Dessert Table Order",
      category: "Catering & Sweets",
      requirements: "Order 2-tier eggless custom flavor cake with candles, cake knife, and dessert platters.",
    },
    {
      title: "Balloon Arch & Celebration Photo-Booth Setup",
      category: "Decor & Floral",
      requirements: "Confirm balloon color scheme with decorator and install themed backdrop 2 hours prior.",
    },
    {
      title: "Return Gifts & Goodie Bags for Children & Guests",
      category: "Family Coordination",
      requirements: "Assemble curated gift hampers labeled with age-appropriate activity sets.",
    },
    {
      title: "Confirm Pure Veg & Jain Dietary Requirements",
      category: "Catering & Sweets",
      requirements: "Verify separate counter without onion/garlic for grandparents and fasting guests.",
    },
    {
      title: "Photographer & Candid Videographer Arrival",
      category: "Photography & Media",
      requirements: "Confirm photographer arrives 30 mins before cake cutting for family portraits.",
    },
  ],
  COMMUNITY: [
    {
      title: "Municipal Corporation & Police Sound Permissions",
      category: "Permits & Logistics",
      requirements: "Verify 10 PM sound restriction compliance and obtain written local ward clearance.",
    },
    {
      title: "Electrical Generator Backup & Sound System",
      category: "Permits & Logistics",
      requirements: "Contract 15kVA silent diesel generator and wireless microphone setup for announcements.",
    },
    {
      title: "Community Kitchen (Langar / Prasad) Distribution",
      category: "Catering & Sweets",
      requirements: "Organize biodegradable leaf plates, water tankers, and volunteer servers.",
    },
    {
      title: "Post-Event Swachhata (Cleanliness) Drive",
      category: "Permits & Logistics",
      requirements: "Arrange segregated dry/wet waste bins and coordinate morning pickup with sanitation team.",
    },
  ],
};

export default function EventWorkspaceClient({
  initialPlan,
  isAuthenticated,
  backUrl,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "budget" | "plan" | "timeline" | "tasks" | "vendors" | "ideas" | "impact"
  >("overview");

  // Dynamic Event State (editable inline)
  const [event, setEvent] = useState(initialPlan.event);
  const currency = event.currency || "INR";
  const currencySymbol = currency === "INR" ? "₹" : "$";

  const [budgetItems, setBudgetItems] = useState<BudgetItemEntity[]>(
    initialPlan.budgetItems
  );
  const [milestones, setMilestones] = useState<TimelineMilestoneEntity[]>(
    initialPlan.milestones
  );
  const [vendorTasks, setVendorTasks] = useState<VendorTaskEntity[]>(
    initialPlan.vendorTasks
  );
  const [ideas] = useState(initialPlan.ideas);

  // Status feedback
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Command Centre Visual Controls
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [milestoneFilter, setMilestoneFilter] = useState<"ALL" | "DUE_SOON" | "COMPLETED">("ALL");
  const [taskBoardView, setTaskBoardView] = useState<"kanban" | "list">("kanban");
  const [taskFilterCategory, setTaskFilterCategory] = useState<string>("ALL");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // AI Celebration Copilot State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string | undefined>(undefined);

  const handleOpenCopilotWithPrompt = (prompt: string) => {
    setCopilotInitialPrompt(prompt);
    setIsCopilotOpen(true);
  };

  // Edit Event Modal State
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventTitle, setEditEventTitle] = useState(event.title);
  const [editEventDate, setEditEventDate] = useState(
    event.eventDate ? new Date(event.eventDate).toISOString().split("T")[0] : ""
  );
  const [editEventLocation, setEditEventLocation] = useState(event.location);
  const [editEventGuestCount, setEditEventGuestCount] = useState(
    event.guestCount.toString()
  );
  const [editEventBudgetDollars, setEditEventBudgetDollars] = useState(
    (event.totalBudgetCents / 100).toString()
  );
  // Add Budget Item Modal State (for BudgetLedgerTab)
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);

  // Change Impact Simulation State
  const [simGuestCount, setSimGuestCount] = useState<number>(event.guestCount);
  const [simBudgetDollars, setSimBudgetDollars] = useState<string>(
    (event.totalBudgetCents / 100).toString()
  );

  // Outstanding tasks count for unified Plan & Checklist tab navigation
  const outstandingTasksCount = useMemo(() => {
    const uncompletedMilestones = milestones.filter(
      (m) => m.status !== "COMPLETED" && m.status !== "CANCELLED"
    ).length;
    const milestoneTitles = new Set(milestones.map((m) => m.title.toLowerCase().trim()));
    const uncompletedCustomTasks = vendorTasks.filter(
      (t) =>
        t.status !== "COMPLETED" &&
        t.status !== "CANCELLED" &&
        !milestoneTitles.has(t.title.toLowerCase().trim())
    ).length;
    return uncompletedMilestones + uncompletedCustomTasks;
  }, [milestones, vendorTasks]);

  // Derived summaries using pure deterministic domain functions
  const budgetSummary: BudgetFinancialSummary = calculateBudgetSummary(
    event.totalBudgetCents,
    event.guestCount,
    budgetItems
  );

  const timelineSummary: TimelineSummary = calculateTimelineSummary(
    event.eventDate,
    milestones
  );

  // Clear feedback after 4 seconds
  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 0. Update Event Details
  const handleSaveEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const totalBudgetCents = toCents(parseFloat(editEventBudgetDollars) || 0);
      const guestCount = parseInt(editEventGuestCount, 10) || event.guestCount;
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_EVENT_DETAILS",
          title: editEventTitle.trim() || event.title,
          eventDate: editEventDate
            ? new Date(editEventDate).toISOString()
            : event.eventDate,
          location: editEventLocation.trim() || event.location,
          guestCount,
          totalBudgetCents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update celebration details.");
      }

      const data = await res.json();
      setEvent(data.event);
      setShowEditEventModal(false);
      showFeedback("success", "Celebration details updated successfully.");
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Error updating celebration details."
      );
    } finally {
      setIsSaving(false);
    }
  };


  const handleCreateBudgetItemDirect = async (itemData: {
    category: string;
    description: string;
    estimatedCostCents: number;
    actualCostCents?: number;
    status?: BudgetItemEntity["status"];
    isGuestSensitive?: boolean;
  }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_BUDGET_ITEM",
          category: itemData.category.trim() || "General",
          description: itemData.description.trim(),
          estimatedCostCents: itemData.estimatedCostCents,
          actualCostCents: itemData.actualCostCents ?? 0,
          status: itemData.status ?? "ESTIMATED",
          isGuestSensitive: itemData.isGuestSensitive ?? false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add budget item.");
      }

      const data = await res.json();
      setBudgetItems((prev) => [...prev, data.item]);
      showFeedback("success", "Item added to ledger.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error adding item.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBudgetItemDirect = async (
    itemId: string,
    updates: {
      description?: string;
      category?: string;
      estimatedCostCents?: number;
      actualCostCents?: number;
      status?: BudgetItemEntity["status"];
    }
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_BUDGET_ITEM",
          itemId,
          description: updates.description,
          category: updates.category,
          estimatedCostCents: updates.estimatedCostCents,
          actualCostCents: updates.actualCostCents,
          status: updates.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update budget item.");
      }

      setBudgetItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...(updates.description !== undefined && {
                  description: updates.description,
                }),
                ...(updates.category !== undefined && {
                  category: updates.category,
                }),
                ...(updates.estimatedCostCents !== undefined && {
                  estimatedCostCents: updates.estimatedCostCents,
                }),
                ...(updates.actualCostCents !== undefined && {
                  actualCostCents: updates.actualCostCents,
                }),
                ...(updates.status !== undefined && { status: updates.status }),
                isCustomByUser: true,
              }
            : item
        )
      );
      showFeedback("success", "Budget item saved.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error saving item.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Budget item delete
  const handleDeleteBudgetItem = async (itemId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_BUDGET_ITEM",
          itemId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete budget item.");
      }

      setBudgetItems((prev) => prev.filter((item) => item.id !== itemId));
      showFeedback("success", "Item deleted.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error deleting item.");
    } finally {
      setIsSaving(false);
    }
  };


  // 4. Milestone status toggle (quick toggle for Overview cards)
  const handleToggleMilestone = async (milestone: TimelineMilestoneEntity) => {
    const nextStatus: TimelineMilestoneEntity["status"] =
      milestone.status === "COMPLETED"
        ? "NOT_STARTED"
        : milestone.status === "NOT_STARTED"
        ? "IN_PROGRESS"
        : "COMPLETED";

    const humanStatusLabel =
      nextStatus === "COMPLETED"
        ? "Done"
        : nextStatus === "IN_PROGRESS"
        ? "In progress"
        : "To do";

    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MILESTONE",
          milestoneId: milestone.id,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update task.");
      }

      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestone.id ? { ...m, status: nextStatus, isCustomByUser: true } : m
        )
      );
      showFeedback("success", `Task marked as ${humanStatusLabel}.`);
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error updating task.");
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Vendor task status change (for Kanban & List checkboxes)
  const handleSetTaskStatus = async (
    task: VendorTaskEntity,
    nextStatus: VendorTaskEntity["status"]
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_VENDOR_TASK",
          taskId: task.id,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update task.");
      }

      setVendorTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: nextStatus, isCustomByUser: true } : t
        )
      );
      showFeedback("success", `Task marked as ${nextStatus.replace("_", " ")}.`);
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error updating task.");
    } finally {
      setIsSaving(false);
    }
  };

  // 5b. Direct Vendor Actions for Vendors & Bookings Workspace
  const handleAddVendorDirect = async (vendor: {
    category: string;
    title: string;
    requirements?: string;
    estimatedCostCents?: number;
  }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_VENDOR_TASK",
          category: vendor.category.trim() || "General",
          title: vendor.title.trim(),
          requirements: vendor.requirements?.trim() || "",
          estimatedCostCents: vendor.estimatedCostCents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add vendor.");
      }

      const data = await res.json();
      setVendorTasks((prev) => [...prev, data.task]);
      showFeedback("success", "Vendor added to workspace.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error adding vendor.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVendorDirect = async (
    taskId: string,
    updates: {
      status?: VendorTaskEntity["status"];
      requirements?: string;
      title?: string;
      category?: string;
      estimatedCostCents?: number | null;
    }
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_VENDOR_TASK",
          taskId,
          ...updates,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update vendor.");
      }

      const data = await res.json();
      setVendorTasks((prev) =>
        prev.map((t) => (t.id === taskId ? data.task : t))
      );
      showFeedback("success", "Vendor details updated.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error updating vendor.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Direct Timeline Milestone Actions for Warm Human Celebration Timeline Tab
  const handleAddMilestoneDirect = async (item: {
    title: string;
    dueAt: string;
    description?: string;
    offsetDaysFromEvent?: number;
  }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_MILESTONE",
          title: item.title.trim(),
          dueAt: item.dueAt,
          description: item.description?.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add task to timeline.");
      }

      const data = await res.json();
      setMilestones((prev) => [...prev, data.milestone]);
      showFeedback("success", "Task added to timeline.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error adding task.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMilestoneDirect = async (
    milestoneId: string,
    updates: {
      title?: string;
      description?: string;
      dueAt?: string;
      status?: TimelineMilestoneEntity["status"];
    }
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MILESTONE",
          milestoneId,
          ...updates,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update task.");
      }

      const data = await res.json();
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? data.milestone : m))
      );
      showFeedback("success", "Task updated.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error updating task.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_MILESTONE",
          milestoneId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove task.");
      }

      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
      showFeedback("success", "Task removed from timeline.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error removing task.");
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Task Delete
  const handleDeleteTask = async (taskId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_VENDOR_TASK",
          taskId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete task.");
      }

      setVendorTasks((prev) => prev.filter((t) => t.id !== taskId));
      showFeedback("success", "Task removed.");
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error deleting task.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Contextual Cultural Task
  const handleAddSuggestedTask = async (suggestion: {
    title: string;
    category: string;
    requirements: string;
  }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_VENDOR_TASK",
          category: suggestion.category,
          title: suggestion.title,
          requirements: suggestion.requirements,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add suggestion.");
      }

      const data = await res.json();
      setVendorTasks((prev) => [...prev, data.task]);
      setDismissedSuggestions((prev) => new Set([...prev, suggestion.title]));
      showFeedback("success", `"${suggestion.title}" added to your task board.`);
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error adding suggestion.");
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Convert Idea to Plan with immediate optimistic local state synchronization
  const handleConvertIdea = async (ideaId: string, asType: "BUDGET" | "TASK") => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONVERT_IDEA",
          ideaId,
          asType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to convert idea.");
      }

      const data = await res.json();
      const targetIdea = ideas.find((i) => i.id === ideaId);
      if (targetIdea) {
        if (asType === "BUDGET") {
          setBudgetItems((prev) => [
            ...prev,
            {
              id: data.createdId || `idea-budget-${Date.now()}`,
              eventId: event.id,
              category: targetIdea.category,
              description: `[Idea] ${targetIdea.title}: ${targetIdea.description.slice(0, 80)}`,
              estimatedCostCents: targetIdea.estimatedCostCents ?? 0,
              actualCostCents: 0,
              status: "ESTIMATED",
              origin: "USER_CUSTOM",
              isCustomByUser: true,
              isGuestSensitive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]);
        } else {
          setVendorTasks((prev) => [
            ...prev,
            {
              id: data.createdId || `idea-task-${Date.now()}`,
              eventId: event.id,
              category: targetIdea.category,
              title: `[Idea Task] ${targetIdea.title}`,
              requirements: targetIdea.description,
              status: "NOT_STARTED",
              estimatedCostCents: targetIdea.estimatedCostCents ?? undefined,
              origin: "USER_CUSTOM",
              isCustomByUser: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]);
        }
      }

      showFeedback(
        "success",
        asType === "BUDGET"
          ? "Idea added to Budget Ledger. Check Budget tab."
          : "Idea added to Checklist. Check Plan & Checklist tab."
      );
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Error adding idea.");
    } finally {
      setIsSaving(false);
    }
  };

  // Change Impact Calculations
  const guestImpact = calculateGuestCountImpact(
    event.guestCount,
    simGuestCount,
    event.totalBudgetCents,
    budgetItems
  );

  const budgetImpact = calculateBudgetChangeImpact(
    event.totalBudgetCents,
    toCents(parseFloat(simBudgetDollars) || 0),
    budgetItems
  );

  const ArchetypeIcon =
    event.archetype === "WEDDING"
      ? Heart
      : event.archetype === "BIRTHDAY"
      ? PartyPopper
      : Flag;

  // ==============================================================================
  // DATA PREPARATION FOR VISUAL CHARTS
  // ==============================================================================

  // 1. Group active budget items by category
  const categoryAllocations = useMemo(() => {
    const activeItems = budgetItems.filter((i) => i.status !== "CANCELLED");
    const map: Record<string, number> = {};

    activeItems.forEach((item) => {
      const cat = item.category?.trim() || "Miscellaneous";
      map[cat] = (map[cat] || 0) + (item.estimatedCostCents || 0);
    });

    const totalAllocated = Object.values(map).reduce((sum, v) => sum + v, 0);

    return Object.entries(map)
      .map(([name, cents], index) => ({
        name,
        cents,
        percentage: totalAllocated > 0 ? Math.round((cents / totalAllocated) * 100) : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.cents - a.cents);
  }, [budgetItems]);

  // 2. SVG Donut calculation
  const donutSlices = useMemo(() => {
    const total = categoryAllocations.reduce((sum, item) => sum + item.cents, 0);
    if (total === 0) return [];

    let currentAngle = -90; // Start at 12 o'clock

    return categoryAllocations.map((item) => {
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
  }, [categoryAllocations]);

  // 3. Four-Stage Financial Breakdown
  const financialStages = useMemo(() => {
    const estimatedSum = budgetItems
      .filter((i) => i.status === "ESTIMATED")
      .reduce((acc, i) => acc + (i.estimatedCostCents || 0), 0);

    const quotedSum = budgetItems
      .filter((i) => i.status === "QUOTED")
      .reduce((acc, i) => acc + (i.quotedCostCents || i.estimatedCostCents || 0), 0);

    const committedSum = budgetItems
      .filter((i) => i.status === "COMMITTED")
      .reduce((acc, i) => acc + (i.estimatedCostCents || 0), 0);

    const paidSum = budgetItems
      .filter((i) => i.status === "PAID")
      .reduce((acc, i) => acc + (i.actualCostCents || i.paidAmountCents || i.estimatedCostCents || 0), 0);

    return {
      estimatedSum,
      quotedSum,
      committedSum,
      paidSum,
    };
  }, [budgetItems]);

  // 4. Milestone Attention Filtering
  const filteredMilestones = useMemo(() => {
    if (milestoneFilter === "COMPLETED") {
      return milestones.filter((m) => m.status === "COMPLETED");
    }
    if (milestoneFilter === "DUE_SOON") {
      // Due within 14 days or overdue or in progress
      return milestones.filter(
        (m) =>
          m.status !== "COMPLETED" &&
          (m.status === "IN_PROGRESS" ||
            (m.offsetDaysFromEvent !== undefined && m.offsetDaysFromEvent >= -14))
      );
    }
    return milestones;
  }, [milestones, milestoneFilter]);

  // 5. Kanban Task Board Grouping
  const kanbanColumns = useMemo(() => {
    const filtered =
      taskFilterCategory === "ALL"
        ? vendorTasks
        : vendorTasks.filter((t) => t.category === taskFilterCategory);

    return {
      todo: filtered.filter(
        (t) => t.status === "NOT_STARTED" || t.status === "CANCELLED"
      ),
      inProgress: filtered.filter(
        (t) =>
          t.status === "INQUIRY_SENT" ||
          t.status === "PROPOSAL_RECEIVED" ||
          t.status === "CONTRACT_SIGNED" ||
          t.status === "DEPOSIT_PAID"
      ),
      done: filtered.filter((t) => t.status === "COMPLETED"),
    };
  }, [vendorTasks, taskFilterCategory]);

  // Unique task categories for filtering
  const taskCategories = useMemo(() => {
    const set = new Set<string>();
    vendorTasks.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [vendorTasks]);

  // Available cultural suggestions filtered by dismissed set
  const availableSuggestions = useMemo(() => {
    const list = CULTURAL_TASK_SUGGESTIONS[event.archetype] || CULTURAL_TASK_SUGGESTIONS.COMMUNITY;
    return list.filter((s) => !dismissedSuggestions.has(s.title));
  }, [event.archetype, dismissedSuggestions]);

  // Vendors requiring follow-up (Inquiry Sent or Proposal Received)
  const vendorsRequiringFollowUp = useMemo(() => {
    return vendorTasks.filter(
      (t) => t.status === "INQUIRY_SENT" || t.status === "PROPOSAL_RECEIVED"
    );
  }, [vendorTasks]);

  // SVG Radial Progress Ring calculation
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashoffset =
    ringCircumference - (timelineSummary.completionPercent / 100) * ringCircumference;

  return (
    <div className="min-h-screen bg-atelier-parchment atelier-grain text-primary flex flex-col justify-between p-4 sm:p-8 transition-colors">
      <div className="max-w-6xl mx-auto w-full space-y-7 relative z-10">
        {/* Workspace Top Navigation Bar — Architectural & Quiet */}
        <header className="flex items-center justify-between py-2 border-b border-border/80 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href={backUrl}
              className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-primary transition group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{isAuthenticated ? "Dashboard" : "Home"}</span>
            </Link>
            <span className="text-border">/</span>
            <span className="font-serif italic text-muted truncate max-w-[220px] sm:max-w-xs">
              {event.title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {feedbackMsg && (
              <span
                role="status"
                className={`text-[11px] px-3 py-0.5 rounded-full font-medium transition animate-fade-in ${
                  feedbackMsg.type === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
                }`}
              >
                {feedbackMsg.text}
              </span>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-champagne" />
              <span>{isAuthenticated ? "Verified Session" : "Guest Atelier"}</span>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* =========================================================================
            ROW 1: CELEBRATION COMMAND CENTRE SUMMARY
           ========================================================================= */}
        <section
          aria-label="Celebration Summary"
          className="bg-surface/85 backdrop-blur-sm border border-border/80 rounded-2xl p-6 sm:p-7 shadow-subtle relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Event Identity & Essential Metadata */}
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-3 text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-muted flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-plum dark:text-champagne font-semibold">
                  <ArchetypeIcon className="w-3.5 h-3.5 text-coral" />
                  <span>{event.archetype} COMMAND CENTRE</span>
                </span>
                <span className="text-border">•</span>
                <span className="font-mono text-secondary">{currency}</span>
                <span className="text-border">•</span>
                <span className="text-coral font-semibold">
                  {timelineSummary.daysUntilEvent >= 0
                    ? `${timelineSummary.daysUntilEvent} Days Remaining`
                    : "Celebration Completed"}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-normal text-primary tracking-tight leading-tight truncate">
                {event.title}
              </h1>

              <div className="flex items-center gap-4 text-xs text-secondary/80 flex-wrap pt-0.5 font-sans">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-champagne shrink-0" />
                  <span>{formatIndianDate(event.eventDate)}</span>
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-champagne shrink-0" />
                  <span>{event.location || "Location TBD"}</span>
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-champagne shrink-0" />
                  <span>{event.guestCount} Guests</span>
                </span>
                <span className="text-border">•</span>
                <button
                  onClick={() => {
                    setEditEventTitle(event.title);
                    setEditEventDate(
                      event.eventDate
                        ? new Date(event.eventDate).toISOString().split("T")[0]
                        : ""
                    );
                    setEditEventLocation(event.location);
                    setEditEventGuestCount(event.guestCount.toString());
                    setEditEventBudgetDollars(
                      (event.totalBudgetCents / 100).toString()
                    );
                    setShowEditEventModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-coral hover:text-coral-hover underline decoration-coral/40 underline-offset-4"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>

            {/* Center-Right: Celebration Readiness Radial Indicator */}
            <div className="flex items-center gap-5 shrink-0 bg-page/60 dark:bg-black/25 border border-border/80 rounded-2xl p-4 sm:px-5">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    className="stroke-border/70"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    className="stroke-champagne transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-serif text-lg font-bold text-primary leading-none">
                    {timelineSummary.completionPercent}%
                  </span>
                  <span className="text-[9px] text-muted tracking-tight mt-0.5">Ready</span>
                </div>
              </div>

              <div className="space-y-1 text-xs min-w-[140px]">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted block">
                  Celebration Readiness
                </span>
                <span className="font-serif text-sm font-medium text-primary block">
                  {timelineSummary.completedMilestones} of {timelineSummary.totalMilestones} Milestones
                </span>
                <span className="text-[11px] text-secondary/70 block">
                  {timelineSummary.completionPercent >= 80
                    ? "In final readiness stage"
                    : timelineSummary.completionPercent >= 40
                    ? "Active coordination in progress"
                    : "Early planning phase"}
                </span>
              </div>
            </div>

            {/* Right: Quick Action Hub */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
              <button
                onClick={() => {
                  setCopilotInitialPrompt(undefined);
                  setIsCopilotOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-coral/15 to-champagne/20 hover:from-coral/25 hover:to-champagne/30 text-primary border border-champagne/40 font-medium text-xs transition shadow-subtle group"
              >
                <Sparkles className="w-3.5 h-3.5 text-coral group-hover:rotate-12 transition-transform" />
                <span>Ask AI Planner</span>
              </button>
              <button
                onClick={() => setActiveTab("plan")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-aubergine dark:bg-champagne hover:bg-aubergine-dark dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs transition shadow-subtle"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Task</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("budget");
                  setShowAddBudgetModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border hover:border-champagne text-secondary hover:text-primary font-medium text-xs transition"
              >
                <Receipt className="w-3.5 h-3.5 text-champagne" />
                <span>+ Add Expense</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            WORKSPACE NAVIGATION TABS
           ========================================================================= */}
        <nav
          aria-label="Workspace Sections"
          className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto border-b border-border/80 text-xs no-scrollbar -mt-2 select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 transition flex items-center gap-1.5 sm:gap-2 shrink-0 border-b-2 font-sans tracking-wide ${
              activeTab === "overview"
                ? "border-aubergine text-aubergine dark:border-champagne dark:text-champagne font-semibold"
                : "border-transparent text-muted hover:text-primary font-medium"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Command Centre</span>
          </button>

          <button
            onClick={() => setActiveTab("budget")}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 transition flex items-center gap-1.5 sm:gap-2 shrink-0 border-b-2 font-sans tracking-wide ${
              activeTab === "budget"
                ? "border-aubergine text-aubergine dark:border-champagne dark:text-champagne font-semibold"
                : "border-transparent text-muted hover:text-primary font-medium"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Budget Ledger</span>
            <span className="text-[11px] text-muted font-mono">
              ({budgetItems.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab("plan")}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 transition flex items-center gap-1.5 sm:gap-2 shrink-0 border-b-2 font-sans tracking-wide ${
              activeTab === "plan" || activeTab === "timeline" || activeTab === "tasks"
                ? "border-aubergine text-aubergine dark:border-champagne dark:text-champagne font-semibold"
                : "border-transparent text-muted hover:text-primary font-medium"
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Plan &amp; Checklist</span>
            <span className="text-[11px] text-muted font-mono">
              ({outstandingTasksCount})
            </span>
          </button>

          <button
            onClick={() => setActiveTab("vendors")}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 transition flex items-center gap-1.5 sm:gap-2 shrink-0 border-b-2 font-sans tracking-wide ${
              activeTab === "vendors"
                ? "border-aubergine text-aubergine dark:border-champagne dark:text-champagne font-semibold"
                : "border-transparent text-muted hover:text-primary font-medium"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Vendors &amp; Bookings</span>
            <span className="text-[11px] text-muted font-mono">
              ({vendorTasks.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ideas")}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 transition flex items-center gap-1.5 sm:gap-2 shrink-0 border-b-2 font-sans tracking-wide ${
              activeTab === "ideas"
                ? "border-aubergine text-aubergine dark:border-champagne dark:text-champagne font-semibold"
                : "border-transparent text-muted hover:text-primary font-medium"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-coral" />
            <span>Inspiration Studio</span>
            <span className="text-[11px] text-coral font-mono">
              ({ideas.length})
            </span>
          </button>

          {/* User-Facing Section: Plan Adjustments */}
          <button
            onClick={() => setActiveTab("impact")}
            className={`py-2.5 sm:py-3 px-2 sm:px-3 transition flex items-center gap-1.5 sm:gap-2 shrink-0 border-b-2 font-sans tracking-wide ${
              activeTab === "impact"
                ? "border-coral text-coral font-semibold"
                : "border-transparent text-coral/80 hover:text-coral font-medium"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Plan Adjustments</span>
          </button>
        </nav>

        {/* =========================================================================
            TAB 1: VISUAL CELEBRATION COMMAND CENTRE
           ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            {/* ---------------------------------------------------------------------
                ROW 2: FINANCIAL INSIGHTS & VISUAL BUDGET CHARTS
               --------------------------------------------------------------------- */}
            <section
              aria-label="Financial Insights"
              className="bg-surface/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 sm:p-7 shadow-subtle space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-primary flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-champagne" />
                    <span>Financial Allocation &amp; Spending Insights</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Real-time integer-paise tracking ({currency}). Genuine distinctions between early estimates, vendor quotations, commitments, and actual payments.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-serif font-medium text-secondary">
                    Total Envelope:{" "}
                    <strong className="text-primary font-bold">
                      {formatCentsToCurrency(event.totalBudgetCents, currency)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Chart Grid: Donut + Category Bar Chart + Stage Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Donut Chart (5 cols) */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-page/50 dark:bg-black/20 border border-border/60">
                  {donutSlices.length > 0 ? (
                    <div className="flex flex-col items-center w-full space-y-4">
                      {/* SVG Donut */}
                      <div className="relative w-52 h-52">
                        <svg viewBox="0 0 200 200" className="w-full h-full transform transition-transform">
                          {donutSlices.map((slice) => {
                            const isHovered = hoveredSlice === slice.name;
                            return (
                              <path
                                key={slice.name}
                                d={slice.pathData}
                                fill={slice.color}
                                className="transition-all duration-200 cursor-pointer hover:opacity-90"
                                style={{
                                  transform: isHovered ? "scale(1.03)" : "scale(1)",
                                  transformOrigin: "100px 100px",
                                }}
                                onMouseEnter={() => setHoveredSlice(slice.name)}
                                onMouseLeave={() => setHoveredSlice(null)}
                              />
                            );
                          })}
                        </svg>

                        {/* Donut Center Display */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted">
                            {hoveredSlice || "Allocated"}
                          </span>
                          <span className="font-serif text-lg font-bold text-primary leading-tight mt-0.5">
                            {hoveredSlice
                              ? formatCentsToCurrency(
                                  categoryAllocations.find((c) => c.name === hoveredSlice)?.cents || 0,
                                  currency
                                )
                              : formatCentsToCurrency(budgetSummary.totalEstimatedCostCents, currency)}
                          </span>
                          <span className="text-[11px] text-champagne font-medium">
                            {hoveredSlice
                              ? `${categoryAllocations.find((c) => c.name === hoveredSlice)?.percentage}% of total`
                              : `${budgetSummary.allocationPercent}% Allocated`}
                          </span>
                        </div>
                      </div>

                      {/* Donut Categorical Legend */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-xs pt-2 border-t border-border/60">
                        {categoryAllocations.slice(0, 6).map((cat) => (
                          <div
                            key={cat.name}
                            onMouseEnter={() => setHoveredSlice(cat.name)}
                            onMouseLeave={() => setHoveredSlice(null)}
                            className="flex items-center justify-between gap-1 text-[11px] cursor-pointer hover:text-primary transition"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="truncate">{cat.name}</span>
                            </div>
                            <span className="font-mono text-muted shrink-0">{cat.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Graceful Empty State */
                    <div className="py-10 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-border mx-auto flex items-center justify-center text-muted">
                        <PieChart className="w-8 h-8 opacity-40" />
                      </div>
                      <span className="text-xs text-muted block">No expenses in budget ledger yet</span>
                      <button
                        onClick={() => setShowAddBudgetModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine text-xs font-medium"
                      >
                        + Add First Expense
                      </button>
                    </div>
                  )}
                </div>

                {/* Horizontal Category Distribution + Financial Stages (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Category Horizontal Bar Ranking */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted block">
                      Category Allocation Distribution
                    </span>
                    <div className="space-y-2.5">
                      {categoryAllocations.slice(0, 5).map((cat) => (
                        <div key={cat.name} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-primary">{cat.name}</span>
                            <span className="font-mono text-secondary">
                              {formatCentsToCurrency(cat.cents, currency)} ({cat.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${cat.percentage}%`,
                                backgroundColor: cat.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4-Stage Genuine Financial Distinction */}
                  <div className="pt-4 border-t border-border/80">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted block mb-3">
                      Expense Stage Lifecycle (Non-Duplicated)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {/* Stage 1: Planning Estimates */}
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                          1. Estimates
                        </span>
                        <span className="font-serif text-base font-bold text-primary block">
                          {formatCentsToCurrency(financialStages.estimatedSum, currency)}
                        </span>
                        <span className="text-[10px] text-muted block">Initial target</span>
                      </div>

                      {/* Stage 2: Vendor Quotes */}
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                        <span className="text-[10px] font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                          2. Quotes
                        </span>
                        <span className="font-serif text-base font-bold text-primary block">
                          {formatCentsToCurrency(financialStages.quotedSum, currency)}
                        </span>
                        <span className="text-[10px] text-muted block">Proposals received</span>
                      </div>

                      {/* Stage 3: Committed Contracts */}
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                        <span className="text-[10px] font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider block">
                          3. Committed
                        </span>
                        <span className="font-serif text-base font-bold text-primary block">
                          {formatCentsToCurrency(financialStages.committedSum, currency)}
                        </span>
                        <span className="text-[10px] text-muted block">Contracts signed</span>
                      </div>

                      {/* Stage 4: Paid Expenses */}
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                        <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                          4. Paid / Settled
                        </span>
                        <span className="font-serif text-base font-bold text-primary block">
                          {formatCentsToCurrency(financialStages.paidSum, currency)}
                        </span>
                        <span className="text-[10px] text-muted block">Disbursed funds</span>
                      </div>
                    </div>

                    {/* Contingency Reserve Margin */}
                    <div className="mt-3.5 flex items-center justify-between p-3 rounded-xl bg-page/70 border border-border/80 text-xs">
                      <span className="text-secondary font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-champagne shrink-0" />
                        <span>Unallocated Contingency Reserve Buffer</span>
                      </span>
                      <span
                        className={`font-serif text-sm font-bold ${
                          budgetSummary.unallocatedBudgetCents < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {formatCentsToCurrency(budgetSummary.unallocatedBudgetCents, currency)}{" "}
                        {budgetSummary.unallocatedBudgetCents < 0 ? "(Deficit Alert)" : "(Safe Reserve)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ---------------------------------------------------------------------
                ROW 3: CELEBRATION READINESS & TIMELINE COMMAND
               --------------------------------------------------------------------- */}
            <section
              aria-label="Milestones & Timeline"
              className="bg-surface/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 sm:p-7 shadow-subtle space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-primary flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-coral" />
                    <span>Your Celebration Timeline</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Everything you need to get ready, one step at a time.
                  </p>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted text-[11px] font-medium mr-1">Show:</span>
                  <button
                    onClick={() => setMilestoneFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      milestoneFilter === "ALL"
                        ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine font-medium"
                        : "bg-surface border border-border text-secondary hover:text-primary"
                    }`}
                  >
                    All ({milestones.length})
                  </button>
                  <button
                    onClick={() => setMilestoneFilter("DUE_SOON")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      milestoneFilter === "DUE_SOON"
                        ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine font-medium"
                        : "bg-surface border border-border text-secondary hover:text-primary"
                    }`}
                  >
                    Due Soon / Overdue
                  </button>
                  <button
                    onClick={() => setMilestoneFilter("COMPLETED")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      milestoneFilter === "COMPLETED"
                        ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine font-medium"
                        : "bg-surface border border-border text-secondary hover:text-primary"
                    }`}
                  >
                    Done ({milestones.filter((m) => m.status === "COMPLETED").length})
                  </button>
                </div>
              </div>

              {/* Milestones Trajectory Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMilestones.slice(0, 6).map((m) => {
                  const isCompleted = m.status === "COMPLETED";
                  const isInProgress = m.status === "IN_PROGRESS";
                  const isDueSoon =
                    !isCompleted &&
                    m.offsetDaysFromEvent !== undefined &&
                    m.offsetDaysFromEvent >= -14;

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-page/60 border border-border/80 hover:border-champagne/50 shadow-subtle flex flex-col justify-between space-y-3 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-sans text-muted">
                            Due by {formatIndianDate(m.dueAt)}
                          </span>
                          {isDueSoon && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                              Requires Attention
                            </span>
                          )}
                        </div>

                        <h4
                          className={`font-serif text-base font-medium text-primary ${
                            isCompleted ? "line-through text-muted" : ""
                          }`}
                        >
                          {m.title}
                        </h4>

                        {m.description && (
                          <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                            {m.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        {m.offsetDaysFromEvent !== undefined ? (
                          <span className="text-[11px] text-champagne font-medium">
                            {Math.abs(m.offsetDaysFromEvent)} days before
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          onClick={() => handleToggleMilestone(m)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider border transition ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                              : isInProgress
                              ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                              : "bg-surface text-secondary border-border hover:bg-surface-elevated"
                          }`}
                          title={isCompleted ? "Click to reopen task" : "Click to advance status"}
                        >
                          {isCompleted ? "Done" : isInProgress ? "In progress" : "To do"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs">
                <button
                  onClick={() => setActiveTab("plan")}
                  className="inline-flex items-center gap-1.5 text-muted hover:text-primary transition"
                >
                  <Plus className="w-3.5 h-3.5 text-coral" />
                  <span>+ Add to Plan</span>
                </button>

                <button
                  onClick={() => setActiveTab("plan")}
                  className="text-xs text-coral hover:text-coral-hover font-medium transition"
                >
                  View Complete Celebration Plan ({milestones.length}) →
                </button>
              </div>
            </section>

            {/* ---------------------------------------------------------------------
                ROW 4: FAMILY PLANNING BOARD (Kanban + List + Indian Contextual Tasks)
               --------------------------------------------------------------------- */}
            <section
              aria-label="Family Planning Board"
              className="bg-surface/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 sm:p-7 shadow-subtle space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-primary flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-champagne" />
                    <span>Family Planning &amp; Coordination Board</span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Coordinate duties across family members, relatives, and logistics. Interactive To-Do, In-Progress, and Done board.
                  </p>
                </div>

                {/* View Switcher & Category Filter */}
                <div className="flex items-center gap-3 text-xs">
                  {/* Category Dropdown */}
                  <select
                    value={taskFilterCategory}
                    onChange={(e) => setTaskFilterCategory(e.target.value)}
                    className="bg-page border border-border rounded-lg px-2.5 py-1.5 text-xs text-primary"
                  >
                    <option value="ALL">All Categories ({vendorTasks.length})</option>
                    {taskCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Kanban vs List Switcher */}
                  <div className="flex items-center bg-page border border-border rounded-lg p-0.5">
                    <button
                      onClick={() => setTaskBoardView("kanban")}
                      className={`p-1.5 rounded transition ${
                        taskBoardView === "kanban"
                          ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine"
                          : "text-muted hover:text-primary"
                      }`}
                      title="Kanban Board View"
                    >
                      <Kanban className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTaskBoardView("list")}
                      className={`p-1.5 rounded transition ${
                        taskBoardView === "list"
                          ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine"
                          : "text-muted hover:text-primary"
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab("plan")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aubergine dark:bg-champagne text-white dark:text-aubergine text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Task</span>
                  </button>
                </div>
              </div>

              {/* Contextual Indian Celebration Task Suggestions (Dismissable) */}
              {availableSuggestions.length > 0 && (
                <div className="p-4 rounded-xl bg-champagne/10 border border-champagne/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-coral" />
                      <span>Recommended Indian Celebration Tasks ({event.archetype}):</span>
                    </span>
                    <span className="text-[11px] text-muted">Click &quot;+ Add&quot; to save to your board</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {availableSuggestions.slice(0, 3).map((sugg) => (
                      <div
                        key={sugg.title}
                        className="p-3 rounded-lg bg-surface border border-border/80 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-medium text-primary block leading-tight">
                            {sugg.title}
                          </span>
                          <span className="text-[10px] text-muted block line-clamp-1">
                            {sugg.requirements}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleAddSuggestedTask(sugg)}
                            className="px-2 py-1 rounded bg-coral/10 hover:bg-coral/20 text-coral font-medium text-[10px] transition"
                            title="Add to Board"
                          >
                            + Add
                          </button>
                          <button
                            onClick={() =>
                              setDismissedSuggestions(
                                (prev) => new Set([...prev, sugg.title])
                              )
                            }
                            className="p-1 text-muted hover:text-primary transition"
                            title="Dismiss suggestion"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Board: Kanban Mode */}
              {taskBoardView === "kanban" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Column 1: To Do */}
                  <div className="space-y-3 bg-page/50 border border-border/70 rounded-xl p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <span className="font-serif text-sm font-semibold text-primary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>To Do</span>
                      </span>
                      <span className="font-mono text-xs text-muted">
                        ({kanbanColumns.todo.length})
                      </span>
                    </div>

                    <div className="space-y-2.5 min-h-[140px]">
                      {kanbanColumns.todo.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-lg bg-surface border border-border/80 shadow-subtle space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-primary leading-tight">
                              {t.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-page text-muted">
                              {t.category}
                            </span>
                          </div>

                          {t.requirements && (
                            <p className="text-[11px] text-muted line-clamp-2">
                              {t.requirements}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                            {t.estimatedCostCents ? (
                              <span className="font-mono text-muted">
                                {formatCentsToCurrency(t.estimatedCostCents, currency)}
                              </span>
                            ) : (
                              <span />
                            )}
                            <button
                              onClick={() => handleSetTaskStatus(t, "INQUIRY_SENT")}
                              className="text-coral hover:text-coral-hover font-medium flex items-center gap-0.5"
                            >
                              <span>Start</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {kanbanColumns.todo.length === 0 && (
                        <span className="text-[11px] text-muted italic block text-center py-6">
                          No pending tasks
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 2: In Progress */}
                  <div className="space-y-3 bg-page/50 border border-border/70 rounded-xl p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <span className="font-serif text-sm font-semibold text-primary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>In Progress</span>
                      </span>
                      <span className="font-mono text-xs text-muted">
                        ({kanbanColumns.inProgress.length})
                      </span>
                    </div>

                    <div className="space-y-2.5 min-h-[140px]">
                      {kanbanColumns.inProgress.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-lg bg-surface border border-amber-500/20 shadow-subtle space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-primary leading-tight">
                              {t.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-amber-500/10 text-amber-700">
                              {t.status.replace("_", " ")}
                            </span>
                          </div>

                          {t.requirements && (
                            <p className="text-[11px] text-muted line-clamp-2">
                              {t.requirements}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                            <button
                              onClick={() => handleSetTaskStatus(t, "NOT_STARTED")}
                              className="text-muted hover:text-primary"
                            >
                              ← Revert
                            </button>
                            <button
                              onClick={() => handleSetTaskStatus(t, "COMPLETED")}
                              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium flex items-center gap-0.5"
                            >
                              <span>Complete</span>
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {kanbanColumns.inProgress.length === 0 && (
                        <span className="text-[11px] text-muted italic block text-center py-6">
                          No tasks in progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Done */}
                  <div className="space-y-3 bg-page/50 border border-border/70 rounded-xl p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <span className="font-serif text-sm font-semibold text-primary flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span>Done / Finalized</span>
                      </span>
                      <span className="font-mono text-xs text-muted">
                        ({kanbanColumns.done.length})
                      </span>
                    </div>

                    <div className="space-y-2.5 min-h-[140px]">
                      {kanbanColumns.done.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-lg bg-surface/70 border border-emerald-500/20 shadow-subtle space-y-2 text-xs opacity-85"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium line-through text-muted leading-tight">
                              {t.title}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                            <span className="text-[10px] text-muted">{t.category}</span>
                            <button
                              onClick={() => handleSetTaskStatus(t, "NOT_STARTED")}
                              className="text-muted hover:text-primary text-[10px] underline"
                            >
                              Reopen
                            </button>
                          </div>
                        </div>
                      ))}
                      {kanbanColumns.done.length === 0 && (
                        <span className="text-[11px] text-muted italic block text-center py-6">
                          No completed tasks yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Task Board: List Mode */
                <div className="space-y-2">
                  {vendorTasks.map((t) => {
                    const isCompleted = t.status === "COMPLETED";
                    return (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-page/60 border border-border/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() =>
                              handleSetTaskStatus(t, isCompleted ? "NOT_STARTED" : "COMPLETED")
                            }
                            className="rounded border-border text-coral focus:ring-coral w-4 h-4 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span
                              className={`font-medium text-primary block truncate ${
                                isCompleted ? "line-through text-muted" : ""
                              }`}
                            >
                              {t.title}
                            </span>
                            {t.requirements && (
                              <span className="text-[11px] text-muted truncate block">
                                {t.requirements}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-border">
                            {t.category}
                          </span>
                          {t.estimatedCostCents && (
                            <span className="font-mono text-secondary text-xs">
                              {formatCentsToCurrency(t.estimatedCostCents, currency)}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="p-1 text-muted hover:text-red-500 transition"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ---------------------------------------------------------------------
                ROW 5: VENDOR & FAMILY COORDINATION HUB
               --------------------------------------------------------------------- */}
            <section
              aria-label="Vendor & Family Coordination"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Vendors Requiring Follow-Up */}
              <div className="bg-surface/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-subtle space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <h3 className="font-serif text-lg font-normal text-primary flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-coral" />
                      <span>Vendors Requiring Follow-Up</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab("vendors")}
                      className="text-xs text-coral hover:text-coral-hover font-medium transition"
                    >
                      View All ({vendorTasks.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {vendorsRequiringFollowUp.slice(0, 4).map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl bg-page/60 border border-border/70 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-medium text-primary block">{v.title}</span>
                          <span className="text-[11px] text-muted">
                            {v.category} • {v.status === "INQUIRY_SENT" ? "Awaiting Quote" : "Quote In Review"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSetTaskStatus(v, "CONTRACT_SIGNED")}
                          className="px-2.5 py-1 rounded-lg bg-aubergine dark:bg-champagne text-white dark:text-aubergine font-medium text-[10px]"
                        >
                          Sign Contract
                        </button>
                      </div>
                    ))}
                    {vendorsRequiringFollowUp.length === 0 && (
                      <span className="text-xs text-muted italic block py-4 text-center">
                        All active vendor inquiries and proposals are settled.
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex justify-between items-center text-xs">
                  <span className="text-muted">
                    {vendorsRequiringFollowUp.length} vendor partners pending response
                  </span>
                  <button
                    onClick={() => setActiveTab("vendors")}
                    className="text-coral font-medium hover:underline"
                  >
                    Manage Pipeline →
                  </button>
                </div>
              </div>

              {/* Planning Assumptions & Permitted Verification */}
              <div className="bg-[#FAF6F0] dark:bg-[#1B141E] border-l-2 border-champagne p-6 rounded-r-2xl text-xs space-y-3 shadow-subtle flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-base font-normal text-primary flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-champagne shrink-0" />
                    <span>Celebration Coordination Memo</span>
                  </h3>
                  <div className="space-y-2 text-muted leading-relaxed">
                    <p>
                      <strong>Local Pricing Assumptions:</strong>{" "}
                      {initialPlan.assumptions?.budgetAssumptions?.[0] ||
                        "Standard metropolitan vendor rates indexed for Indian peak wedding & festive season."}
                    </p>
                    <p>
                      <strong>Permissions &amp; Logistics:</strong>{" "}
                      {initialPlan.assumptions?.permissionsToVerify?.[0] ||
                        "Verify venue noise curfew (10 PM), generator load capacity, and valet parking bays."}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-secondary font-medium">
                    Need to simulate budget adjustments?
                  </span>
                  <button
                    onClick={() => setActiveTab("impact")}
                    className="text-coral hover:text-coral-hover font-semibold transition"
                  >
                    Open Plan Adjustments →
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =========================================================================
            SECTION 4: TAB 2 — BUDGET LEDGER
           ========================================================================= */}
        {activeTab === "budget" && (
          <BudgetLedgerTab
            event={event}
            budgetItems={budgetItems}
            currency={currency}
            currencySymbol={currencySymbol}
            isSaving={isSaving}
            onAddItem={handleCreateBudgetItemDirect}
            onUpdateItem={handleUpdateBudgetItemDirect}
            onDeleteItem={handleDeleteBudgetItem}
            showFeedback={showFeedback}
            showAddModal={showAddBudgetModal}
            setShowAddModal={setShowAddBudgetModal}
            onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
          />
        )}

        {/* =========================================================================
            SECTION 5: TAB 3 — TIMELINE
           ========================================================================= */}
        {/* =========================================================================
            SECTION 5: PLAN & CHECKLIST (Unified Timeline & Tasks Workspace)
           ========================================================================= */}
        {(activeTab === "plan" || activeTab === "timeline" || activeTab === "tasks") && (
          <PlanChecklistTab
            event={event}
            milestones={milestones}
            vendorTasks={vendorTasks}
            isSaving={isSaving}
            onAddMilestone={handleAddMilestoneDirect}
            onUpdateMilestone={handleUpdateMilestoneDirect}
            onDeleteMilestone={handleDeleteMilestone}
            onAddCustomTask={handleAddVendorDirect}
            onUpdateCustomTask={handleUpdateVendorDirect}
            onDeleteCustomTask={handleDeleteTask}
            onShowFeedback={showFeedback}
          />
        )}

        {/* =========================================================================
            SECTION 7: TAB 5 — VENDORS & BOOKINGS
           ========================================================================= */}
        {activeTab === "vendors" && (
          <VendorsBookingsTab
            event={event}
            vendorTasks={vendorTasks}
            isSaving={isSaving}
            onAddVendor={handleAddVendorDirect}
            onUpdateVendor={handleUpdateVendorDirect}
            onDeleteVendor={handleDeleteTask}
            onShowFeedback={showFeedback}
            onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
          />
        )}

        {/* =========================================================================
            SECTION 8: TAB 6 — CELEBRATION INSPIRATION STUDIO
           ========================================================================= */}
        {activeTab === "ideas" && (
          <InspirationStudioTab
            event={event}
            dbIdeas={ideas}
            currency={currency}
            currencySymbol={currencySymbol}
            isSaving={isSaving}
            onConvertIdea={handleConvertIdea}
            onAddDirectBudget={handleCreateBudgetItemDirect}
            onAddDirectTask={handleAddVendorDirect}
            showFeedback={showFeedback}
          />
        )}

        {/* =========================================================================
            SECTION 9: TAB 7 — PLAN ADJUSTMENTS (User-Facing Name)
           ========================================================================= */}
        {activeTab === "impact" && (
          <div className="space-y-6 animate-fade-in">
            {/* Signature Atmospheric Atelier Panel */}
            <div className="bg-aubergine text-cream dark:bg-[#1D1621] dark:text-[#FAF6F8] rounded-3xl p-6 sm:p-8 border border-champagne/30 shadow-atelier space-y-6 relative overflow-hidden">
              {/* Subtle Champagne Radial Lighting Accent */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-champagne/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Sliders className="w-5 h-5 text-coral" />
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-cream dark:text-white tracking-tight">
                    Plan Adjustments
                  </h2>
                </div>
                <p className="text-xs text-champagne/90 italic font-serif text-base mb-1">
                  See what changes when your plans evolve.
                </p>
                <p className="text-xs text-[#FAF6F8]/70 max-w-2xl leading-relaxed">
                  Simulate variations in guest counts or overall budget envelope. The engine calculates ripple effects across all guest-scaled ledger items in integer paise ({currency}) without modifying your saved plan.
                </p>
              </div>

              {/* Simulation Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                {/* Guest Count Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#FAF6F8]/80">Simulate Guest Count:</span>
                    <span className="font-serif text-lg font-normal text-coral">
                      {simGuestCount} Guests{" "}
                      <span className="text-xs text-[#FAF6F8]/50 font-sans">
                        (Saved: {event.guestCount})
                      </span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={simGuestCount}
                    onChange={(e) => setSimGuestCount(parseInt(e.target.value))}
                    className="w-full accent-coral"
                  />
                  <div className="flex justify-between text-[10px] text-[#FAF6F8]/40 font-mono">
                    <span>10 guests</span>
                    <span>500 guests</span>
                    <span>1,000 guests</span>
                  </div>
                </div>

                {/* Total Budget Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#FAF6F8]/80">Simulate Total Budget:</span>
                    <span className="font-serif text-lg font-normal text-coral">
                      {formatCentsToCurrency(toCents(parseFloat(simBudgetDollars) || 0), currency)}{" "}
                      <span className="text-xs text-[#FAF6F8]/50 font-sans">
                        (Saved: {formatCentsToCurrency(event.totalBudgetCents, currency)})
                      </span>
                    </span>
                  </div>
                  <input
                    type="number"
                    step="5000"
                    min="1000"
                    value={simBudgetDollars}
                    onChange={(e) => setSimBudgetDollars(e.target.value)}
                    className="w-full bg-black/30 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-coral"
                  />
                </div>
              </div>

              {/* Contextual AI Copilot Plan Adjustment Explanation Trigger */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenCopilotWithPrompt(
                      `Analyze our proposed plan adjustment: simulating ${simGuestCount} guests (currently ${event.guestCount}) with ${simBudgetDollars ? formatCentsToCurrency(toCents(parseFloat(simBudgetDollars) || 0), currency) : "budget"}. Explain the cost ripple effects, capacity bottlenecks, and trade-offs.`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-serif font-medium transition shadow-subtle hover:scale-105 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-coral" />
                  <span>Ask Copilot to Explain Adjustment</span>
                </button>
              </div>

              {/* Simulation Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#FAF6F8]/60 block">
                    Projected Total Cost
                  </span>
                  <span className="font-serif text-2xl font-normal text-white block">
                    {formatCentsToCurrency(guestImpact.newProjectedEstimatedCents, currency)}
                  </span>
                  <span className="text-[11px] text-champagne block">
                    Delta:{" "}
                    {guestImpact.newProjectedEstimatedCents - guestImpact.previousTotalEstimatedCents >= 0 ? "+" : ""}
                    {formatCentsToCurrency(
                      guestImpact.newProjectedEstimatedCents - guestImpact.previousTotalEstimatedCents,
                      currency
                    )}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#FAF6F8]/60 block">
                    Simulated Buffer
                  </span>
                  <span
                    className={`font-serif text-2xl font-normal block ${
                      budgetImpact.unallocatedBudgetCents < 0
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {formatCentsToCurrency(budgetImpact.unallocatedBudgetCents, currency)}
                  </span>
                  <span className="text-[11px] text-[#FAF6F8]/60 block">
                    {budgetImpact.isOverBudget ? "Over Budget Warning" : "Safe Reserve Buffer"}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-[#FAF6F8]/60 block">
                    Affected Items
                  </span>
                  <span className="font-serif text-2xl font-normal text-white block">
                    {guestImpact.guestSensitiveItemCount} Ledger Items
                  </span>
                  <span className="text-[11px] text-[#FAF6F8]/60 block">
                    Scaled dynamically with guest count
                  </span>
                </div>
              </div>

              {/* Overrun Warning if applicable */}
              {guestImpact.warnings.length > 0 && (
                <div className="bg-coral/20 border border-coral/40 rounded-2xl p-4 text-xs text-white flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Capacity &amp; Budget Warnings</span>
                    <ul className="list-disc list-inside space-y-0.5 text-white/80">
                      {guestImpact.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Recalculated Guest-Scaled Items */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <h3 className="font-serif text-base font-normal text-white">
                  Guest-Scaled Items Impact Ledger
                </h3>
                <div className="space-y-2">
                  {budgetItems
                    .filter((i) => i.isGuestSensitive && i.status !== "CANCELLED")
                    .map((item) => {
                      const scaledCents =
                        event.guestCount > 0
                          ? Math.round((item.estimatedCostCents * simGuestCount) / event.guestCount)
                          : item.estimatedCostCents;

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-medium text-white block">{item.description}</span>
                            <span className="text-[11px] text-[#FAF6F8]/50 block">
                              Category: {item.category}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-serif text-sm font-normal text-white block">
                              {formatCentsToCurrency(scaledCents, currency)}
                            </span>
                            <span className="text-[10px] text-[#FAF6F8]/50 block">
                              Simulated for {simGuestCount} guests (Saved:{" "}
                              {formatCentsToCurrency(item.estimatedCostCents, currency)})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EDIT CELEBRATION DETAILS MODAL */}
      {showEditEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-champagne/40 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-serif text-xl font-normal text-primary flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-coral" />
                <span>Edit Celebration Details</span>
              </h3>
              <button
                onClick={() => setShowEditEventModal(false)}
                className="text-muted hover:text-primary transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEventDetails} className="space-y-4 text-xs">
              <div>
                <label className="text-muted font-medium block mb-1">Celebration Title</label>
                <input
                  type="text"
                  value={editEventTitle}
                  onChange={(e) => setEditEventTitle(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3.5 py-2.5 text-primary text-sm focus:outline-none focus:border-coral"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-muted font-medium block mb-1">Event Date</label>
                  <input
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary focus:outline-none focus:border-coral"
                    required
                  />
                </div>
                <div>
                  <label className="text-muted font-medium block mb-1">Guest Count</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={editEventGuestCount}
                    onChange={(e) => setEditEventGuestCount(e.target.value)}
                    className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary focus:outline-none focus:border-coral"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-muted font-medium block mb-1">Venue / City</label>
                  <input
                    type="text"
                    value={editEventLocation}
                    onChange={(e) => setEditEventLocation(e.target.value)}
                    className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary focus:outline-none focus:border-coral"
                    required
                  />
                </div>
                <div>
                  <label className="text-muted font-medium block mb-1">
                    Total Budget ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="1000"
                    value={editEventBudgetDollars}
                    onChange={(e) => setEditEventBudgetDollars(e.target.value)}
                    className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary focus:outline-none focus:border-coral"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditEventModal(false)}
                  className="px-4 py-2 rounded-xl text-muted hover:text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine font-medium text-xs shadow-subtle transition"
                >
                  {isSaving ? "Saving Changes..." : "Update Celebration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editorial Footer */}
      <footer className="text-center text-muted text-xs py-6 border-t border-border/80 mt-12 font-serif italic">
        SynapseEvent • The Art of a Well-Planned Celebration
      </footer>

      {/* Floating AI Planner Atelier Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            setCopilotInitialPrompt(undefined);
            setIsCopilotOpen(true);
          }}
          className="px-4 py-3 rounded-full bg-aubergine hover:bg-aubergine-dark dark:bg-champagne dark:hover:bg-champagne-dark text-white dark:text-aubergine shadow-2xl flex items-center gap-2 text-xs font-serif font-medium border border-champagne/40 transition hover:scale-105 active:scale-95 group"
        >
          <Sparkles className="w-4 h-4 text-coral animate-pulse" />
          <span>Ask AI Planner</span>
        </button>
      </div>

      {/* Celebration Copilot Drawer */}
      <CelebrationCopilotDrawer
        event={event}
        currency={currency}
        currencySymbol={currencySymbol}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onAddBudget={handleCreateBudgetItemDirect}
        onAddTask={handleAddVendorDirect}
        showFeedback={showFeedback}
        initialPrompt={copilotInitialPrompt}
      />
    </div>
  );
}
