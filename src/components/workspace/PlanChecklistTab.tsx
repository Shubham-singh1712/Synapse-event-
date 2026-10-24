"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Sparkles,
  X,
  Check,
  List,
  ChevronDown,
  ChevronRight,
  Cake,
  Gift,
  Camera,
  Utensils,
  Music,
  MapPin,
  Shirt,
  Sparkle,
  MessageSquare,
  Heart,
  Flame,
  AlertCircle,
  Tag,
} from "lucide-react";
import type { EventEntity, TimelineMilestoneEntity, VendorTaskEntity } from "@/lib/domain/schemas";
import {
  mergeToUnifiedTasks,
  calculatePlanSummary,
  groupTasksForTimeline,
  CELEBRATION_TASK_CATEGORIES,
  formatNaturalRelativeDueDate,
  type UnifiedPlanTask,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/domain/plan";
import { formatIndianDate } from "@/lib/domain/i18n";
import { addDaysToDate } from "@/lib/domain/timeline";

interface PlanChecklistTabProps {
  event: EventEntity;
  milestones: TimelineMilestoneEntity[];
  vendorTasks: VendorTaskEntity[];
  isSaving: boolean;
  onAddMilestone: (item: {
    title: string;
    dueAt: string;
    description?: string;
    offsetDaysFromEvent?: number;
  }) => Promise<void>;
  onUpdateMilestone: (
    milestoneId: string,
    updates: {
      title?: string;
      description?: string;
      dueAt?: string;
      status?: TimelineMilestoneEntity["status"];
    }
  ) => Promise<void>;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onAddCustomTask?: (task: {
    category: string;
    title: string;
    requirements?: string;
  }) => Promise<void>;
  onUpdateCustomTask?: (
    taskId: string,
    updates: {
      status?: VendorTaskEntity["status"];
      requirements?: string;
      title?: string;
      category?: string;
    }
  ) => Promise<void>;
  onDeleteCustomTask?: (taskId: string) => Promise<void>;
  onShowFeedback: (type: "success" | "error", text: string) => void;
}

// Tailored suggestions by Archetype
interface SuggestedPlanItem {
  title: string;
  description: string;
  recommendedOffsetDays: number;
  category: string;
}

const BIRTHDAY_PLAN_SUGGESTIONS: SuggestedPlanItem[] = [
  {
    title: "Confirm the venue or home setup",
    description: "Finalize event area, seating, lighting, and power outlets for music and cake table.",
    recommendedOffsetDays: -20,
    category: "Venue & Setup",
  },
  {
    title: "Order the birthday cake",
    description: "Finalize favorite flavor, custom message, size, and scheduled delivery time.",
    recommendedOffsetDays: -7,
    category: "Cake & Desserts",
  },
  {
    title: "Finalize the food menu",
    description: "Confirm snacks, live counters, main buffet, and options for children and elders.",
    recommendedOffsetDays: -14,
    category: "Catering & Food",
  },
  {
    title: "Send invitations through WhatsApp",
    description: "Share digital invitation card with timing, Google Maps venue location, and RSVP request.",
    recommendedOffsetDays: -15,
    category: "Invitations & RSVP",
  },
  {
    title: "Arrange decorations",
    description: "Book balloon arch, themed backdrop, fairy lights, and welcome easel board.",
    recommendedOffsetDays: -10,
    category: "Decor & Flowers",
  },
  {
    title: "Buy the birthday outfit",
    description: "Complete fittings and try on celebration dress, accessories, and shoes.",
    recommendedOffsetDays: -12,
    category: "Wardrobe & Styling",
  },
  {
    title: "Prepare return gifts",
    description: "Pack curated return gifts, games, or sweet boxes for children and visiting families.",
    recommendedOffsetDays: -5,
    category: "Family Coordination",
  },
  {
    title: "Confirm the photographer",
    description: "Lock in arrival time for family portraits, cake cutting, and candid memories.",
    recommendedOffsetDays: -8,
    category: "Photography & Media",
  },
  {
    title: "Coordinate relatives",
    description: "Confirm airport or railway station pickups and accommodation for outstation family.",
    recommendedOffsetDays: -3,
    category: "Travel & Logistics",
  },
  {
    title: "Arrange seating for elders",
    description: "Ensure quiet, cushioned front-row seating away from loudspeakers for grandparents.",
    recommendedOffsetDays: -2,
    category: "Family Coordination",
  },
];

const WEDDING_PLAN_SUGGESTIONS: SuggestedPlanItem[] = [
  {
    title: "Confirm venue & catering menu",
    description: "Lock in timings, seating arrangements, and live food counters with the venue team.",
    recommendedOffsetDays: -60,
    category: "Venue & Setup",
  },
  {
    title: "Coordinate wedding outfits & jewellery",
    description: "Complete final fittings for bride, groom, and family attire with accessories and safas.",
    recommendedOffsetDays: -30,
    category: "Wardrobe & Styling",
  },
  {
    title: "Send wedding invitations & track WhatsApp RSVPs",
    description: "Distribute boxed invitation cards and digital links with Google Maps locations.",
    recommendedOffsetDays: -45,
    category: "Invitations & RSVP",
  },
  {
    title: "Arrange guest accommodation & station cabs",
    description: "Book hotel room blocks and coordinate railway/airport cabs for outstation family.",
    recommendedOffsetDays: -25,
    category: "Travel & Logistics",
  },
  {
    title: "Plan Mehendi, Haldi & Sangeet celebrations",
    description: "Curate song playlist, book dholak artist, and order fresh yellow marigolds and henna cones.",
    recommendedOffsetDays: -20,
    category: "Ceremony & Rituals",
  },
  {
    title: "Confirm Pandit ji & ceremony muhurat timing",
    description: "Verify exact phera timings, hawan samagri list, and mandap sacred fire setup.",
    recommendedOffsetDays: -15,
    category: "Ceremony & Rituals",
  },
  {
    title: "Settle final vendor balances & shagun lifafas",
    description: "Prepare cash envelopes (lifafas) for dakshina, staff tips, and final vendor payments.",
    recommendedOffsetDays: -2,
    category: "Family Coordination",
  },
];

export function PlanChecklistTab({
  event,
  milestones,
  vendorTasks,
  isSaving,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddCustomTask,
  onUpdateCustomTask,
  onDeleteCustomTask,
  onShowFeedback,
}: PlanChecklistTabProps) {
  // View toggle: "timeline" (chronological visual sequence) vs "checklist" (action-first list)
  const [activeView, setActiveView] = useState<"timeline" | "checklist">("timeline");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "TODO" | "IN_PROGRESS" | "DONE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "title" | "recent">("due_date");

  // Collapsible completed section state
  const [showCompletedTimeline, setShowCompletedTimeline] = useState(false);

  // Modal: Add Task
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Modal: Edit Task
  const [editingTask, setEditingTask] = useState<UnifiedPlanTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("NOT_STARTED");

  // Modal: Delete Confirmation
  const [taskToDelete, setTaskToDelete] = useState<UnifiedPlanTask | null>(null);

  // Suggestions dismissal
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // 1. Unified Tasks List (derived deterministically without duplication)
  const unifiedTasks = useMemo(() => {
    return mergeToUnifiedTasks(milestones, vendorTasks);
  }, [milestones, vendorTasks]);

  // 2. Plan Progress Summary
  const summary = useMemo(() => {
    return calculatePlanSummary(unifiedTasks, event.eventDate);
  }, [unifiedTasks, event.eventDate]);

  // 3. Chronological Groups for Timeline View
  const timelineGroups = useMemo(() => {
    return groupTasksForTimeline(unifiedTasks);
  }, [unifiedTasks]);

  // 4. Filtered & Sorted Tasks for Checklist View
  const filteredChecklistTasks = useMemo(() => {
    let result = [...unifiedTasks];

    // Status Filter
    if (statusFilter === "TODO") {
      result = result.filter((t) => t.status === "NOT_STARTED");
    } else if (statusFilter === "IN_PROGRESS") {
      result = result.filter((t) => t.status === "IN_PROGRESS");
    } else if (statusFilter === "DONE") {
      result = result.filter((t) => t.status === "COMPLETED");
    }

    // Category Filter
    if (categoryFilter !== "ALL") {
      result = result.filter(
        (t) => t.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Priority Filter
    if (priorityFilter !== "ALL") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "priority") {
        const pOrder: Record<TaskPriority, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          NORMAL: 1,
        };
        return pOrder[b.priority] - pOrder[a.priority];
      }
      if (sortBy === "due_date") {
        if (!a.dueAt && !b.dueAt) return 0;
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return a.dueAt.localeCompare(b.dueAt);
      }
      return 0;
    });

    return result;
  }, [unifiedTasks, statusFilter, categoryFilter, priorityFilter, searchQuery, sortBy]);

  // 5. Contextual Suggestions tailored to Event Archetype
  const activeSuggestions = useMemo(() => {
    const list =
      event.archetype === "WEDDING"
        ? WEDDING_PLAN_SUGGESTIONS
        : BIRTHDAY_PLAN_SUGGESTIONS;

    const existingTitles = new Set(unifiedTasks.map((t) => t.title.toLowerCase().trim()));
    return list.filter(
      (s) => !dismissedSuggestions.has(s.title) && !existingTitles.has(s.title.toLowerCase().trim())
    );
  }, [event.archetype, dismissedSuggestions, unifiedTasks]);

  // Category Icon Resolver
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("cater") || cat.includes("food")) return Utensils;
    if (cat.includes("cake") || cat.includes("dessert")) return Cake;
    if (cat.includes("decor") || cat.includes("flower")) return Sparkle;
    if (cat.includes("photo") || cat.includes("video")) return Camera;
    if (cat.includes("outfit") || cat.includes("wardrobe") || cat.includes("styling")) return Shirt;
    if (cat.includes("ceremony") || cat.includes("ritual") || cat.includes("pandit")) return Flame;
    if (cat.includes("invite") || cat.includes("whatsapp")) return MessageSquare;
    if (cat.includes("music") || cat.includes("entertainment")) return Music;
    if (cat.includes("travel") || cat.includes("logistics")) return MapPin;
    if (cat.includes("family") || cat.includes("elder")) return Heart;
    if (cat.includes("gift")) return Gift;
    return Tag;
  };

  // Quick Status Toggle Handler
  const handleToggleTaskStatus = async (task: UnifiedPlanTask) => {
    const nextStatus = task.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED";
    try {
      if (task.source === "milestone") {
        await onUpdateMilestone(task.id, { status: nextStatus });
      } else if (onUpdateCustomTask) {
        await onUpdateCustomTask(task.id, { status: nextStatus });
      }
    } catch {
      // Feedback handled in parent
    }
  };

  // Handle Add Task Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onShowFeedback("error", "Task title is required.");
      return;
    }

    try {
      if (newDueDate) {
        // Has a due date -> save as milestone
        await onAddMilestone({
          title: newTitle.trim(),
          dueAt: newDueDate,
          description: newDescription.trim() || undefined,
        });
      } else if (onAddCustomTask) {
        // No due date -> save as general action task
        await onAddCustomTask({
          title: newTitle.trim(),
          category: newCategory.trim() || "General",
          requirements: newDescription.trim() || undefined,
        });
      } else {
        // Fallback: if no custom task handler, save as milestone on event date
        await onAddMilestone({
          title: newTitle.trim(),
          dueAt: event.eventDate,
          description: newDescription.trim() || undefined,
        });
      }

      setShowAddModal(false);
      setNewTitle("");
      setNewDueDate("");
      setNewDescription("");
      setNewCategory("General");
    } catch {
      // Feedback handled in parent
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (task: UnifiedPlanTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category);
    setEditDueDate(task.dueAt || "");
    setEditDescription(task.description || "");
    setEditStatus(task.status);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTitle.trim()) {
      onShowFeedback("error", "Task title is required.");
      return;
    }

    try {
      if (editingTask.source === "milestone") {
        await onUpdateMilestone(editingTask.id, {
          title: editTitle.trim(),
          description: editDescription.trim(),
          dueAt: editDueDate || editingTask.dueAt || event.eventDate,
          status: editStatus,
        });
      } else if (onUpdateCustomTask) {
        const vendorStatus: VendorTaskEntity["status"] =
          editStatus === "COMPLETED"
            ? "COMPLETED"
            : editStatus === "CANCELLED"
            ? "CANCELLED"
            : editStatus === "IN_PROGRESS"
            ? "INQUIRY_SENT"
            : "NOT_STARTED";
        await onUpdateCustomTask(editingTask.id, {
          title: editTitle.trim(),
          category: editCategory.trim(),
          requirements: editDescription.trim(),
          status: vendorStatus,
        });
      }
      setEditingTask(null);
    } catch {
      // Feedback handled in parent
    }
  };

  // Handle Delete Task
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      if (taskToDelete.source === "milestone") {
        await onDeleteMilestone(taskToDelete.id);
      } else if (onDeleteCustomTask) {
        await onDeleteCustomTask(taskToDelete.id);
      }
      setTaskToDelete(null);
    } catch {
      // Feedback handled in parent
    }
  };

  // 1-Click Add Suggestion
  const handleAddSuggestion = async (s: SuggestedPlanItem) => {
    try {
      const calculatedDueAt = addDaysToDate(event.eventDate, s.recommendedOffsetDays);
      await onAddMilestone({
        title: s.title,
        description: s.description,
        dueAt: calculatedDueAt,
        offsetDaysFromEvent: s.recommendedOffsetDays,
      });
      setDismissedSuggestions((prev) => new Set([...prev, s.title]));
    } catch {
      // Feedback handled in parent
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* =========================================================================
          1. EDITORIAL HEADER & UNIFIED VIEW CONTROLS
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-primary tracking-tight">
              Your Celebration Plan
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-aubergine/10 dark:bg-champagne/15 text-aubergine dark:text-champagne border border-aubergine/20 dark:border-champagne/30">
              {summary.outstandingTasks} to do
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
            Everything you need to do, organized by date and priority.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Toggle: Timeline vs Checklist */}
          <div className="inline-flex rounded-xl bg-surface-elevated p-1 border border-border shadow-inner-subtle">
            <button
              onClick={() => setActiveView("timeline")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeView === "timeline"
                  ? "bg-surface text-primary shadow-subtle border border-border/60"
                  : "text-muted hover:text-primary"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Timeline View</span>
            </button>
            <button
              onClick={() => setActiveView("checklist")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeView === "checklist"
                  ? "bg-surface text-primary shadow-subtle border border-border/60"
                  : "text-muted hover:text-primary"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Checklist View</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aubergine dark:bg-champagne hover:bg-aubergine-dark dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs sm:text-sm transition shadow-subtle"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. READINESS PROGRESS & SPOTLIGHT SECTION
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Metric Card */}
        <div className="p-5 rounded-2xl bg-surface/90 border border-border/80 shadow-subtle flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-border/60"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-coral"
                strokeDasharray={`${summary.completionPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-serif text-sm font-semibold text-primary">
              {summary.completionPercent}%
            </span>
          </div>

          <div>
            <span className="text-[11px] font-sans text-muted uppercase tracking-wider block">
              Readiness Score
            </span>
            <div className="font-serif text-xl font-normal text-primary mt-0.5">
              {summary.completedTasks} of {summary.totalTasks} Done
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted">
              <span>{summary.outstandingTasks} to do</span>
              {summary.dueSoonTasks > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    {summary.dueSoonTasks} due soon
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Up Next Spotlight Card */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-surface/90 border border-border/80 shadow-subtle flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-champagne">
              <Sparkles className="w-3.5 h-3.5" /> Up Next to Handle
            </span>
            {summary.overdueTasks > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30">
                {summary.overdueTasks} past due
              </span>
            )}
          </div>

          {summary.nextUpTask ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h4 className="font-serif text-base sm:text-lg font-normal text-primary">
                  {summary.nextUpTask.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-medium uppercase bg-surface-elevated border border-border">
                    {summary.nextUpTask.category}
                  </span>
                  <span>·</span>
                  <span className="text-coral font-medium">
                    {summary.nextUpTask.dueAt
                      ? `${formatNaturalRelativeDueDate(summary.nextUpTask.dueAt)} (${formatIndianDate(summary.nextUpTask.dueAt)})`
                      : "General task"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleToggleTaskStatus(summary.nextUpTask!)}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-page border border-border text-xs font-medium text-secondary transition self-start sm:self-auto shrink-0"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark Done</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted italic">
              All scheduled tasks are up to date! Add steps or browse recommendations below.
            </p>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: TIMELINE VIEW (Chronological Sequence)
         ========================================================================= */}
      {activeView === "timeline" && (
        <div className="space-y-8">
          {timelineGroups.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface/50 border border-dashed border-border space-y-3">
              <CalendarCheck className="w-10 h-10 text-muted mx-auto opacity-40" />
              <h4 className="font-serif text-lg font-normal text-primary">Your plan is empty</h4>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Add celebration tasks or accept recommended steps below to build your schedule.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Task</span>
              </button>
            </div>
          ) : (
            timelineGroups.map((group) => {
              if (group.key === "COMPLETED") {
                return (
                  <div key={group.key} className="pt-4 border-t border-border/80 space-y-3">
                    <button
                      onClick={() => setShowCompletedTimeline(!showCompletedTimeline)}
                      className="flex items-center justify-between w-full text-left py-2 px-1 text-muted hover:text-primary transition"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-serif text-lg font-normal text-primary">
                          Completed Steps ({group.tasks.length})
                        </span>
                      </div>
                      {showCompletedTimeline ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {showCompletedTimeline && (
                      <div className="space-y-3 pl-4 border-l-2 border-emerald-500/30">
                        {group.tasks.map((task) => (
                          <div
                            key={`${task.source}-${task.id}`}
                            className="p-3.5 rounded-xl bg-surface/60 border border-border/60 flex items-center justify-between gap-3 text-xs opacity-75"
                          >
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => handleToggleTaskStatus(task)}
                                className="text-emerald-600 hover:opacity-75 transition"
                                title="Reopen task"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <span className="line-through text-muted">{task.title}</span>
                            </div>
                            <button
                              onClick={() => setTaskToDelete(task)}
                              className="text-muted hover:text-red-500 p-1"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={group.key} className="space-y-4">
                  {/* Section Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border/70">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-primary">
                        {group.title}
                      </h3>
                      <p className="text-[11px] text-muted">{group.subtitle}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${group.badgeClass}`}
                    >
                      {group.tasks.length}
                    </span>
                  </div>

                  {/* Connected Timeline Sequence Cards */}
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
                    {group.tasks.map((task) => {
                      const CategoryIcon = getCategoryIcon(task.category);
                      const isDone = task.status === "COMPLETED";

                      return (
                        <div key={`${task.source}-${task.id}`} className="relative group">
                          {/* Timeline Node Marker */}
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className="absolute -left-6 top-4 -translate-x-1/2 w-5 h-5 rounded-full bg-surface border-2 border-champagne flex items-center justify-center hover:scale-110 transition z-10"
                            title={isDone ? "Mark to do" : "Mark done"}
                          >
                            {isDone ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Circle className="w-2.5 h-2.5 text-champagne" />
                            )}
                          </button>

                          {/* Task Card */}
                          <div className="p-4 rounded-2xl bg-surface/85 border border-border/80 hover:border-champagne/45 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider bg-aubergine/10 dark:bg-champagne/15 text-aubergine dark:text-champagne border border-aubergine/20 dark:border-champagne/30">
                                  <CategoryIcon className="w-3 h-3" />
                                  {task.category}
                                </span>
                                {task.priority !== "NORMAL" && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                                      task.priority === "CRITICAL"
                                        ? "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30"
                                        : task.priority === "HIGH"
                                        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                                        : "bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/30"
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                )}
                                {task.dueAt && (
                                  <span className="text-xs text-coral font-medium">
                                    {formatNaturalRelativeDueDate(task.dueAt)} (
                                    {formatIndianDate(task.dueAt)})
                                  </span>
                                )}
                              </div>

                              <h4
                                className={`font-serif text-base sm:text-lg font-normal ${
                                  isDone ? "line-through text-muted" : "text-primary"
                                }`}
                              >
                                {task.title}
                              </h4>

                              {task.description && (
                                <p className="text-xs text-muted leading-relaxed line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                              <button
                                onClick={() => handleOpenEdit(task)}
                                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-elevated transition"
                                title="Edit task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setTaskToDelete(task)}
                                className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-surface-elevated transition"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: CHECKLIST VIEW (Action-First Searchable List)
         ========================================================================= */}
      {activeView === "checklist" && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Status, Category, Priority, and Sorting */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plan tasks by title, category, or notes..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-champagne"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | "TODO" | "IN_PROGRESS" | "DONE")
                }
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                <option value="ALL">All Categories</option>
                {CELEBRATION_TASK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical / Past Due</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="NORMAL">Normal</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "due_date" | "priority" | "title" | "recent")
                }
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                <option value="due_date">Due Date</option>
                <option value="priority">Priority</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Checklist Rows */}
          {filteredChecklistTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface/60 border border-dashed border-border space-y-3">
              <CalendarCheck className="w-10 h-10 text-muted mx-auto opacity-40" />
              <h4 className="font-serif text-lg font-normal text-primary">No tasks match your filter</h4>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Try clearing your search or filters to see all plan tasks.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                  setPriorityFilter("ALL");
                }}
                className="text-xs text-coral hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChecklistTasks.map((task) => {
                const CategoryIcon = getCategoryIcon(task.category);
                const isDone = task.status === "COMPLETED";

                return (
                  <div
                    key={`${task.source}-${task.id}`}
                    className={`p-3.5 sm:p-4 rounded-xl border transition flex items-start sm:items-center justify-between gap-3 ${
                      isDone
                        ? "bg-surface/50 border-border/60 opacity-70"
                        : "bg-surface/85 border-border/80 hover:border-champagne/45 shadow-subtle"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      {/* Checkbox toggle */}
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className={`mt-0.5 sm:mt-0 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                          isDone
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-border hover:border-champagne text-transparent"
                        }`}
                        title={isDone ? "Mark to do" : "Mark done"}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      {/* Content */}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-xs sm:text-sm font-medium ${
                              isDone ? "line-through text-muted" : "text-primary"
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-medium uppercase bg-surface-elevated text-secondary border border-border">
                            <CategoryIcon className="w-2.5 h-2.5 text-champagne" />
                            {task.category}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-muted line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {task.dueAt ? (
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${
                            task.isOverdue
                              ? "text-rose-700 dark:text-rose-300"
                              : "text-secondary"
                          }`}
                        >
                          {formatNaturalRelativeDueDate(task.dueAt)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted italic whitespace-nowrap">
                          No date set
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="p-1 rounded-lg text-muted hover:text-primary transition"
                          title="Edit task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTaskToDelete(task)}
                          className="p-1 rounded-lg text-muted hover:text-red-500 transition"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          3. CULTURAL INDIAN CELEBRATION TASK SUGGESTIONS
         ========================================================================= */}
      {activeSuggestions.length > 0 && (
        <div className="pt-6 border-t border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-normal text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-champagne" />
                <span>
                  Recommended Steps for Your{" "}
                  {event.archetype === "WEDDING"
                    ? "Wedding"
                    : event.archetype === "BIRTHDAY"
                    ? "Birthday"
                    : "Celebration"}
                </span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Thoughtful steps tailored for Indian celebrations. Click to add them directly to your schedule.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSuggestions.slice(0, 6).map((s) => (
              <div
                key={s.title}
                className="p-4 rounded-xl bg-surface/70 border border-champagne/25 hover:border-champagne/50 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-champagne">
                    {s.category}
                  </span>
                  <h4 className="font-serif text-base font-normal text-primary mt-1">
                    {s.title}
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                    {s.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <button
                    onClick={() => handleAddSuggestion(s)}
                    disabled={isSaving}
                    className="text-xs font-medium text-coral hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add to Plan
                  </button>
                  <button
                    onClick={() =>
                      setDismissedSuggestions((prev) => new Set([...prev, s.title]))
                    }
                    className="text-[11px] text-muted hover:text-secondary"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD TASK MODAL
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-border shadow-atelier space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-serif text-2xl font-normal text-primary">Add Task</h3>
                <p className="text-xs text-muted mt-0.5">
                  Create a new step for your celebration schedule or checklist.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-muted hover:text-primary transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Task Title <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Confirm wedding cake design, Send WhatsApp invites"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  >
                    {CELEBRATION_TASK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  What needs to be done / Notes
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Flavour tasting, finalize candles and delivery timing with baker."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-secondary hover:text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-aubergine dark:bg-champagne hover:bg-aubergine-dark dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs sm:text-sm transition shadow-subtle disabled:opacity-50"
                >
                  {isSaving ? "Adding..." : "Save to Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT TASK MODAL
         ========================================================================= */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-border shadow-atelier space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-serif text-2xl font-normal text-primary">Edit Task</h3>
                <p className="text-xs text-muted mt-0.5">
                  Update task details, due date, or status.
                </p>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 rounded-lg text-muted hover:text-primary transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Task Title <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                >
                  <option value="NOT_STARTED">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-secondary hover:text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-aubergine dark:bg-champagne hover:bg-aubergine-dark dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs sm:text-sm transition shadow-subtle disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: DELETE CONFIRMATION MODAL
         ========================================================================= */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full border border-border shadow-atelier space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif text-xl font-normal text-primary">Remove Task?</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Are you sure you want to remove <strong>&ldquo;{taskToDelete.title}&rdquo;</strong> from your plan?
            </p>
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-secondary hover:text-primary transition"
              >
                Keep Task
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition disabled:opacity-50"
              >
                {isSaving ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
