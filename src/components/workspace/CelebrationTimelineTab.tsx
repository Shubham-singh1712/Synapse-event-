"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  PlayCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Edit2,
  Sparkles,
  X,
  Check,
  CalendarDays,
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
} from "lucide-react";
import type { EventEntity, TimelineMilestoneEntity } from "@/lib/domain/schemas";
import {
  calculateTimelineSummary,
  getCalendarDaysDiff,
  isValidCalendarDate,
  addDaysToDate,
  type EnrichedMilestone,
  toHumanTimelineStatus,
  fromHumanTimelineStatus,
  type HumanTimelineStatus,
} from "@/lib/domain/timeline";
import { formatIndianDate } from "@/lib/domain/i18n";

// Human-friendly status mappings
export type HumanStatus = HumanTimelineStatus;
export const toHumanStatus = toHumanTimelineStatus;
export const fromHumanStatus = fromHumanTimelineStatus;

// Indian celebration task suggestions tailored by archetype
export interface SuggestedTask {
  title: string;
  description: string;
  recommendedOffsetDays: number; // e.g. -30 for 30 days before event
  categoryBadge: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const BIRTHDAY_SUGGESTIONS: SuggestedTask[] = [
  {
    title: "Order the birthday cake",
    description: "Finalize favorite flavor, custom message, size, and delivery timing.",
    recommendedOffsetDays: -7,
    categoryBadge: "Cake & Food",
    icon: Cake,
  },
  {
    title: "Confirm the catering menu",
    description: "Finalize snacks, main course, desserts, and special options for children and elders.",
    recommendedOffsetDays: -14,
    categoryBadge: "Food",
    icon: Utensils,
  },
  {
    title: "Send invitations on WhatsApp",
    description: "Share the digital invite with time, venue Google Maps link, and RSVP request.",
    recommendedOffsetDays: -15,
    categoryBadge: "Invites",
    icon: MessageSquare,
  },
  {
    title: "Arrange balloons & floral decor",
    description: "Book decor artist or order balloons, banner, fairy lights, and welcome board.",
    recommendedOffsetDays: -10,
    categoryBadge: "Decor",
    icon: Sparkle,
  },
  {
    title: "Buy the celebration outfit",
    description: "Try on and finalize birthday dress, shoes, and any matching family outfits.",
    recommendedOffsetDays: -12,
    categoryBadge: "Outfits",
    icon: Shirt,
  },
  {
    title: "Prepare return gifts & goodie bags",
    description: "Pack thoughtful return gifts, sweets, or games for kids and visiting guests.",
    recommendedOffsetDays: -5,
    categoryBadge: "Gifts",
    icon: Gift,
  },
  {
    title: "Arrange comfortable seating for family elders",
    description: "Ensure quiet, cushioned seating near the celebration area for grandparents and seniors.",
    recommendedOffsetDays: -3,
    categoryBadge: "Comfort",
    icon: Heart,
  },
  {
    title: "Confirm the photographer",
    description: "Confirm timing for cake cutting, family portraits, and candid moments.",
    recommendedOffsetDays: -8,
    categoryBadge: "Memories",
    icon: Camera,
  },
  {
    title: "Coordinate pickup & transport",
    description: "Arrange rides or parking instructions for out-of-town guests and elders.",
    recommendedOffsetDays: -2,
    categoryBadge: "Travel",
    icon: MapPin,
  },
  {
    title: "Confirm final payments with vendors",
    description: "Have UPI or cash ready for decorator, cake artist, caterer, and venue.",
    recommendedOffsetDays: -1,
    categoryBadge: "Finance",
    icon: Sparkles,
  },
];

export const WEDDING_SUGGESTIONS: SuggestedTask[] = [
  {
    title: "Confirm the venue & catering menu",
    description: "Lock in timings, seating arrangements, and live food counters with the venue team.",
    recommendedOffsetDays: -60,
    categoryBadge: "Venue & Food",
    icon: Utensils,
  },
  {
    title: "Coordinate wedding outfits & jewellery",
    description: "Complete final fittings for bride, groom, and family attire with accessories.",
    recommendedOffsetDays: -30,
    categoryBadge: "Outfits",
    icon: Shirt,
  },
  {
    title: "Send invitations and track replies",
    description: "Distribute wedding cards, send digital WhatsApp invites, and log guest RSVPs.",
    recommendedOffsetDays: -45,
    categoryBadge: "Invites",
    icon: MessageSquare,
  },
  {
    title: "Arrange guest accommodation & cabs",
    description: "Block hotel rooms and schedule airport / railway station pickup cabs for family.",
    recommendedOffsetDays: -20,
    categoryBadge: "Hospitality",
    icon: MapPin,
  },
  {
    title: "Plan Mehendi, Haldi & Sangeet details",
    description: "Book mehendi artists, arrange organic haldi samagri, and finalize the Sangeet playlist.",
    recommendedOffsetDays: -25,
    categoryBadge: "Ceremonies",
    icon: Music,
  },
  {
    title: "Coordinate photography & makeup schedule",
    description: "Fix call times with bridal hair and makeup artist and photographer for every function.",
    recommendedOffsetDays: -15,
    categoryBadge: "Services",
    icon: Camera,
  },
  {
    title: "Confirm ceremony rituals with the priest",
    description: "Review muhurat timing, puja samagri list, and hawan requirements with the Pandit.",
    recommendedOffsetDays: -10,
    categoryBadge: "Tradition",
    icon: Heart,
  },
  {
    title: "Prepare welcome hampers & return mithai",
    description: "Assemble gift baskets, sweets, dry fruits, and thank-you notes for visiting guests.",
    recommendedOffsetDays: -7,
    categoryBadge: "Gifts",
    icon: Gift,
  },
];

export const GENERAL_SUGGESTIONS: SuggestedTask[] = [
  {
    title: "Confirm the venue arrangements & audio setup",
    description: "Inspect the hall, microphone, speaker system, and air conditioning.",
    recommendedOffsetDays: -14,
    categoryBadge: "Logistics",
    icon: MapPin,
  },
  {
    title: "Finalize food menu & refreshments",
    description: "Confirm guest headcount, dietary preferences, and timing with the food team.",
    recommendedOffsetDays: -10,
    categoryBadge: "Food",
    icon: Utensils,
  },
  {
    title: "Send event schedule to all attendees",
    description: "Share program flow, entry details, and schedule on WhatsApp or email.",
    recommendedOffsetDays: -7,
    categoryBadge: "Invites",
    icon: MessageSquare,
  },
  {
    title: "Order bouquets & welcome mementos",
    description: "Prepare flowers, shawls, or gifts for honored guests and speakers.",
    recommendedOffsetDays: -5,
    categoryBadge: "Gifts",
    icon: Gift,
  },
  {
    title: "Confirm photographer & videographer",
    description: "Confirm arrival time, key moments to capture, and stage lighting.",
    recommendedOffsetDays: -6,
    categoryBadge: "Media",
    icon: Camera,
  },
];

interface CelebrationTimelineTabProps {
  event: EventEntity;
  milestones: TimelineMilestoneEntity[];
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
  showFeedback: (type: "success" | "error", message: string) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
}

export function CelebrationTimelineTab({
  event,
  milestones,
  isSaving,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  showFeedback,
  showAddModal,
  setShowAddModal,
}: CelebrationTimelineTabProps) {
  // ---------------------------------------------------------------------------
  // FILTER & SEARCH STATE
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "TODO" | "IN_PROGRESS" | "DONE" | "OVERDUE"
  >("ALL");

  // Edit Milestone Modal state
  const [editingMilestone, setEditingMilestone] =
    useState<TimelineMilestoneEntity | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<HumanStatus>("To do");

  // Add Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDueAt, setNewDueAt] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [milestoneToDelete, setMilestoneToDelete] =
    useState<TimelineMilestoneEntity | null>(null);

  // Suggestions panel toggle
  const [showSuggestions, setShowSuggestions] = useState(true);

  // ---------------------------------------------------------------------------
  // PURE TIMELINE SUMMARY (ACCURATE REAL PERSISTENCE VALUES)
  // ---------------------------------------------------------------------------
  const summary = useMemo(
    () => calculateTimelineSummary(event.eventDate, milestones),
    [event.eventDate, milestones]
  );

  const enrichedMilestones = summary.milestones;

  // Natural relative date formatter helper
  const getNaturalRelativeDate = (item: EnrichedMilestone): string => {
    if (item.isOverdue) {
      const days = Math.abs(item.daysUntilDue);
      return days === 1 ? "Overdue by 1 day" : `Overdue by ${days} days`;
    }
    if (item.daysUntilDue === 0) {
      return "Due today";
    }
    if (item.daysUntilDue === 1) {
      return "Due tomorrow";
    }
    if (item.daysUntilDue > 1 && item.daysUntilDue <= 14) {
      return `Due in ${item.daysUntilDue} days`;
    }
    if (
      item.offsetDaysFromEvent !== undefined &&
      item.offsetDaysFromEvent < 0
    ) {
      const days = Math.abs(item.offsetDaysFromEvent);
      return days === 1 ? "1 day before event" : `${days} days before event`;
    }
    return `Due in ${item.daysUntilDue} days`;
  };

  // Find the single next upcoming task
  const nextUpcomingTask = useMemo(() => {
    const pending = enrichedMilestones.filter((m) => m.status !== "COMPLETED");
    if (pending.length === 0) return null;
    // Prefer next non-completed item sorted by due date
    return pending[0];
  }, [enrichedMilestones]);

  // Filtered timeline entries
  const filteredMilestones = useMemo(() => {
    let result = [...enrichedMilestones];

    // Status filter
    if (statusFilter === "TODO") {
      result = result.filter((m) => m.status === "NOT_STARTED");
    } else if (statusFilter === "IN_PROGRESS") {
      result = result.filter((m) => m.status === "IN_PROGRESS");
    } else if (statusFilter === "DONE") {
      result = result.filter((m) => m.status === "COMPLETED");
    } else if (statusFilter === "OVERDUE") {
      result = result.filter((m) => m.isOverdue);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [enrichedMilestones, statusFilter, searchQuery]);

  // Contextual task suggestions based on event archetype
  const contextSuggestions = useMemo(() => {
    const list =
      event.archetype === "BIRTHDAY"
        ? BIRTHDAY_SUGGESTIONS
        : event.archetype === "WEDDING"
        ? WEDDING_SUGGESTIONS
        : GENERAL_SUGGESTIONS;

    // Filter out suggestions whose title matches an existing milestone
    const existingTitles = new Set(
      milestones.map((m) => m.title.toLowerCase().trim())
    );

    return list.filter(
      (s) => !existingTitles.has(s.title.toLowerCase().trim())
    );
  }, [event.archetype, milestones]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleToggleDone = async (item: EnrichedMilestone) => {
    const newStatus: TimelineMilestoneEntity["status"] =
      item.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED";

    try {
      await onUpdateMilestone(item.id, { status: newStatus });
      showFeedback(
        "success",
        newStatus === "COMPLETED"
          ? `"${item.title}" marked as done!`
          : `"${item.title}" reopened.`
      );
    } catch {
      // Handled in parent
    }
  };

  const handleStartEdit = (item: TimelineMilestoneEntity) => {
    setEditingMilestone(item);
    setEditTitle(item.title);
    setEditDueAt(item.dueAt);
    setEditDescription(item.description || "");
    setEditStatus(toHumanStatus(item.status));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;

    if (!editTitle.trim()) {
      showFeedback("error", "Please provide a task name.");
      return;
    }
    if (!editDueAt || !isValidCalendarDate(editDueAt)) {
      showFeedback("error", "Please select a valid due date.");
      return;
    }

    try {
      await onUpdateMilestone(editingMilestone.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        dueAt: editDueAt,
        status: fromHumanStatus(editStatus),
      });

      setEditingMilestone(null);
      showFeedback("success", "Task updated successfully.");
    } catch {
      // Handled in parent
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = newTitle.trim();
    if (!title) {
      setFormError("Please enter a task name.");
      return;
    }

    if (!newDueAt || !isValidCalendarDate(newDueAt)) {
      setFormError("Please choose a valid date (YYYY-MM-DD).");
      return;
    }

    try {
      // Automatically calculate offset from eventDate
      let offsetDaysFromEvent: number | undefined;
      if (isValidCalendarDate(event.eventDate)) {
        offsetDaysFromEvent = getCalendarDaysDiff(event.eventDate, newDueAt);
      }

      await onAddMilestone({
        title,
        dueAt: newDueAt,
        description: newDescription.trim(),
        offsetDaysFromEvent,
      });

      // Reset form
      setNewTitle("");
      setNewDueAt("");
      setNewDescription("");
      setShowAddModal(false);
      showFeedback("success", "Task added to your timeline.");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to add task."
      );
    }
  };

  const handleAddSuggestion = async (suggestion: SuggestedTask) => {
    try {
      // Compute intelligent due date based on recommended offset from event
      let computedDate = event.eventDate;
      if (isValidCalendarDate(event.eventDate)) {
        computedDate = addDaysToDate(
          event.eventDate,
          suggestion.recommendedOffsetDays
        );
      }

      await onAddMilestone({
        title: suggestion.title,
        dueAt: computedDate,
        description: suggestion.description,
        offsetDaysFromEvent: suggestion.recommendedOffsetDays,
      });

      showFeedback("success", `Added "${suggestion.title}" to your timeline.`);
    } catch {
      // Handled in parent
    }
  };

  const confirmDelete = async () => {
    if (!milestoneToDelete) return;
    try {
      await onDeleteMilestone(milestoneToDelete.id);
      setMilestoneToDelete(null);
      showFeedback("success", "Task removed from timeline.");
    } catch {
      // Handled in parent
    }
  };

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* =========================================================================
          1. WELCOMING HEADER & PRIMARY ACTION
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-sans uppercase tracking-[0.2em] text-champagne dark:text-champagne-light font-medium">
              Celebration Planner
            </span>
            <span className="text-muted text-[10px] font-mono">
              &middot; {summary.totalMilestones} Tasks Scheduled
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-primary tracking-tight">
            Your Celebration Timeline
          </h2>
          <p className="text-xs text-muted mt-1 max-w-xl leading-relaxed">
            Everything you need to get ready, one step at a time. Mark tasks done
            as you go, and keep everyone in your family aligned.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-aubergine hover:bg-aubergine-dark dark:bg-champagne dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs transition shadow-subtle shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Timeline</span>
        </button>
      </div>

      {/* =========================================================================
          2. COMPACT PROGRESS OVERVIEW & NEXT TASK SPOTLIGHT
         ========================================================================= */}
      <section
        aria-label="Timeline Progress Overview"
        className="rounded-2xl p-5 sm:p-6 bg-surface/90 border border-border/80 shadow-subtle"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Progress Metrics & Bar (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-border/80 pb-5 lg:pb-0 lg:pr-6">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-sans uppercase tracking-[0.18em] text-muted block">
                  Celebration Readiness
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-serif text-3xl sm:text-4xl font-normal text-primary tracking-tight tabular-nums">
                    {summary.completionPercent}%
                  </span>
                  <span className="text-xs text-muted">
                    ({summary.completedMilestones} of {summary.totalMilestones} completed)
                  </span>
                </div>
              </div>

              {summary.overdueMilestones > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {summary.overdueMilestones} needs attention
                </span>
              )}
            </div>

            {/* Unobtrusive Progress Track */}
            <div className="w-full bg-border/50 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-aubergine dark:bg-champagne h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${summary.completionPercent}%` }}
              />
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              {summary.totalMilestones === 0
                ? "Start by adding your first task or choose from the suggested ideas below."
                : summary.completedMilestones === summary.totalMilestones
                ? "Wonderful! All scheduled tasks are done. Your celebration is fully prepared."
                : `${summary.totalMilestones - summary.completedMilestones} task${
                    summary.totalMilestones - summary.completedMilestones === 1
                      ? ""
                      : "s"
                  } remaining before ${formatIndianDate(event.eventDate)}.`}
            </p>
          </div>

          {/* Up Next Spotlight (7 cols) */}
          <div className="lg:col-span-7">
            {nextUpcomingTask ? (
              <div className="p-4 rounded-xl bg-surface-elevated/70 border border-champagne/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-champagne text-[11px] font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-wider text-[10px]">
                      Up Next
                    </span>
                    <span className="text-muted font-normal text-[11px]">
                      &middot; {getNaturalRelativeDate(nextUpcomingTask)}
                    </span>
                  </div>

                  <h3 className="font-serif text-base text-primary font-normal">
                    {nextUpcomingTask.title}
                  </h3>

                  {nextUpcomingTask.description && (
                    <p className="text-muted text-xs line-clamp-1">
                      {nextUpcomingTask.description}
                    </p>
                  )}

                  <span className="text-[11px] text-muted block font-sans">
                    Due by {formatIndianDate(nextUpcomingTask.dueAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleDone(nextUpcomingTask)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark done</span>
                  </button>

                  <button
                    onClick={() => handleStartEdit(nextUpcomingTask)}
                    className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface transition cursor-pointer"
                    title="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border/60 text-center py-6 text-xs text-muted">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1 stroke-[1.5]" />
                <p className="font-medium text-primary">All caught up!</p>
                <p className="text-[11px] text-muted mt-0.5">
                  No upcoming tasks are currently pending.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SUGGESTED TASKS FOR INDIAN CELEBRATIONS
         ========================================================================= */}
      {contextSuggestions.length > 0 && (
        <section
          aria-label="Suggested Tasks"
          className="rounded-2xl p-5 bg-surface/60 border border-champagne/30 shadow-subtle space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-champagne" />
              <h3 className="font-serif text-base text-primary font-normal">
                Suggested for your {event.archetype === "BIRTHDAY" ? "Birthday" : event.archetype === "WEDDING" ? "Wedding" : "Celebration"}
              </h3>
            </div>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-[11px] text-muted hover:text-primary font-medium transition cursor-pointer"
            >
              {showSuggestions ? "Hide suggestions" : `View ${contextSuggestions.length} suggestions`}
            </button>
          </div>

          {showSuggestions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
              {contextSuggestions.slice(0, 6).map((item, i) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-surface border border-border/70 hover:border-champagne/50 shadow-xs flex items-start justify-between gap-2.5 transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <IconComp className="w-3.5 h-3.5 text-champagne shrink-0" />
                        <span className="font-medium text-primary text-[12px] truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted line-clamp-1">
                        {item.description}
                      </p>
                      <span className="text-[10px] text-champagne font-medium block">
                        {Math.abs(item.recommendedOffsetDays)} days before celebration
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddSuggestion(item)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-champagne/15 text-primary border border-border text-[11px] font-medium shrink-0 transition cursor-pointer mt-0.5"
                      title="Add to timeline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          4. FILTER & SEARCH TOOLBAR
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timeline tasks..."
            className="w-full bg-surface/90 border border-border rounded-xl pl-9 pr-3 py-2 text-primary focus:outline-none focus:border-champagne placeholder:text-muted/60 transition text-xs"
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

        {/* Status Filter Buttons */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {(
            [
              { key: "ALL", label: "All tasks", count: summary.totalMilestones },
              {
                key: "TODO",
                label: "To do",
                count: enrichedMilestones.filter((m) => m.status === "NOT_STARTED")
                  .length,
              },
              {
                key: "IN_PROGRESS",
                label: "In progress",
                count: enrichedMilestones.filter((m) => m.status === "IN_PROGRESS")
                  .length,
              },
              {
                key: "DONE",
                label: "Done",
                count: summary.completedMilestones,
              },
              ...(summary.overdueMilestones > 0
                ? [
                    {
                      key: "OVERDUE" as const,
                      label: "Attention needed",
                      count: summary.overdueMilestones,
                    },
                  ]
                : []),
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
      </div>

      {/* =========================================================================
          5. CONNECTED VERTICAL TIMELINE
         ========================================================================= */}
      {filteredMilestones.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-2xl bg-surface/70 border border-dashed border-border/80 p-8">
          <CalendarDays className="w-10 h-10 text-muted/40 mx-auto stroke-[1.2]" />
          <h3 className="font-serif text-lg font-normal text-primary">
            {searchQuery || statusFilter !== "ALL"
              ? "No matching tasks found"
              : "Your celebration timeline is ready for its first step"}
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search terms or clearing the filter."
              : "Add tasks to keep your family organized, from booking the venue to ordering the cake."}
          </p>

          <div className="pt-2">
            {searchQuery || statusFilter !== "ALL" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-surface border border-border hover:border-champagne text-xs text-secondary transition"
              >
                Reset filters
              </button>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aubergine hover:bg-aubergine-dark dark:bg-champagne dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs transition shadow-subtle cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add first task</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4">
          {/* Subtle Vertical Connecting Line */}
          <div className="absolute left-[13px] sm:left-[17px] top-4 bottom-4 w-0.5 bg-border/80" />

          {filteredMilestones.map((m, index) => {
            const isDone = m.status === "COMPLETED";
            const isNext = nextUpcomingTask?.id === m.id;
            const humanStatus = toHumanStatus(m.status);

            return (
              <div
                key={m.id}
                className="relative group transition-all duration-200"
              >
                {/* Timeline Node Marker */}
                <div
                  className={`absolute -left-[23px] sm:-left-[27px] top-4 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-xs ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : m.isOverdue
                      ? "bg-amber-600 text-white ring-4 ring-amber-500/20"
                      : isNext
                      ? "bg-aubergine dark:bg-champagne text-white dark:text-aubergine ring-4 ring-champagne/25"
                      : "bg-surface border-2 border-border text-muted"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : m.isOverdue ? (
                    <AlertTriangle className="w-3 h-3 stroke-[2.2]" />
                  ) : isNext ? (
                    <Sparkles className="w-3 h-3" />
                  ) : (
                    <span className="text-[10px] font-mono font-medium">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Timeline Item Card */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isDone
                      ? "bg-surface/50 border-border/60 opacity-80"
                      : isNext
                      ? "bg-surface border-champagne/60 shadow-subtle ring-1 ring-champagne/20"
                      : m.isOverdue
                      ? "bg-surface border-amber-500/40 shadow-subtle"
                      : "bg-surface/85 border-border/80 hover:border-champagne/40 shadow-subtle"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    {/* Left: Quick Completion Toggle & Title */}
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleDone(m)}
                        disabled={isSaving}
                        className={`mt-0.5 p-1 rounded-lg transition shrink-0 cursor-pointer ${
                          isDone
                            ? "text-emerald-700 dark:text-emerald-400 hover:text-muted"
                            : "text-muted hover:text-emerald-700 dark:hover:text-emerald-400"
                        }`}
                        title={isDone ? "Click to reopen task" : "Click to mark as done"}
                        aria-label={isDone ? `Reopen ${m.title}` : `Complete ${m.title}`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white dark:fill-emerald-400 dark:text-aubergine" />
                        ) : (
                          <Circle className="w-5 h-5 stroke-[1.7]" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`font-serif text-base sm:text-lg font-normal transition ${
                              isDone
                                ? "line-through text-muted"
                                : "text-primary"
                            }`}
                          >
                            {m.title}
                          </h4>

                          {/* Relative Date Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium border ${
                              m.isOverdue
                                ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                                : isDone
                                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
                                : "bg-champagne/15 text-aubergine dark:text-champagne border-champagne/30"
                            }`}
                          >
                            {getNaturalRelativeDate(m)}
                          </span>

                          {isNext && !isDone && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-aubergine/10 dark:bg-champagne/15 text-aubergine dark:text-champagne border border-aubergine/20">
                              Up next
                            </span>
                          )}
                        </div>

                        {m.description && (
                          <p className="text-muted text-xs leading-relaxed max-w-xl">
                            {m.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-muted pt-0.5">
                          <span>Due by {formatIndianDate(m.dueAt)}</span>
                          {m.offsetDaysFromEvent !== undefined && (
                            <span className="font-mono text-[10px]">
                              ({Math.abs(m.offsetDaysFromEvent)} days from event)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {/* Human Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border ${
                          isDone
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                            : humanStatus === "In progress"
                            ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                            : "bg-surface-elevated text-secondary border-border"
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : humanStatus === "In progress" ? (
                          <PlayCircle className="w-3 h-3 text-amber-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-muted" />
                        )}
                        <span>{humanStatus}</span>
                      </span>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(m)}
                          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
                          title="Edit task"
                          aria-label={`Edit ${m.title}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setMilestoneToDelete(m)}
                          className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-surface-elevated transition cursor-pointer"
                          title="Remove task"
                          aria-label={`Remove ${m.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          6. ADD TO TIMELINE DIALOG
         ========================================================================= */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg bg-surface border border-champagne/40 rounded-2xl p-6 sm:p-7 shadow-card space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-champagne block font-medium mb-0.5">
                  Timeline Planning
                </span>
                <h3 className="font-serif text-xl font-normal text-primary">
                  Add to Timeline
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
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-secondary font-medium block mb-1">
                  Task name
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Order the birthday cake"
                  className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                  required
                />
              </div>

              <div>
                <label className="text-secondary font-medium block mb-1">
                  Due by
                </label>
                <input
                  type="date"
                  value={newDueAt}
                  onChange={(e) => setNewDueAt(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                  required
                />
                <span className="text-[11px] text-muted block mt-1">
                  Celebration Date: {formatIndianDate(event.eventDate)}
                </span>
              </div>

              <div>
                <label className="text-secondary font-medium block mb-1">
                  What needs to be done? (optional notes)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Chocolate truffle flavor, 2 kg, delivery by 4 PM"
                  className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-muted hover:text-primary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-aubergine hover:bg-aubergine-dark dark:bg-champagne dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs shadow-subtle transition cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Add to Timeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. EDIT TASK DIALOG
         ========================================================================= */}
      {editingMilestone && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg bg-surface border border-champagne/40 rounded-2xl p-6 sm:p-7 shadow-card space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-champagne block font-medium mb-0.5">
                  Update Step
                </span>
                <h3 className="font-serif text-xl font-normal text-primary">
                  Edit Task Details
                </h3>
              </div>
              <button
                onClick={() => setEditingMilestone(null)}
                className="p-1 rounded-lg text-muted hover:text-primary transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-secondary font-medium block mb-1">
                  Task name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-secondary font-medium block mb-1">
                    Due by
                  </label>
                  <input
                    type="date"
                    value={editDueAt}
                    onChange={(e) => setEditDueAt(e.target.value)}
                    className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                    required
                  />
                </div>

                <div>
                  <label className="text-secondary font-medium block mb-1">
                    Current progress
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as HumanStatus)}
                    className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne"
                  >
                    <option value="To do">To do</option>
                    <option value="In progress">In progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-secondary font-medium block mb-1">
                  Notes &amp; details
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3 py-2 text-primary focus:outline-none focus:border-champagne leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setEditingMilestone(null)}
                  className="px-4 py-2 rounded-xl text-xs text-muted hover:text-primary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-aubergine hover:bg-aubergine-dark dark:bg-champagne dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs shadow-subtle transition cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. REMOVE TASK CONFIRMATION DIALOG
         ========================================================================= */}
      {milestoneToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-md bg-surface border border-red-500/30 rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-lg font-normal text-primary">
                Remove Task from Timeline?
              </h3>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-primary font-medium">
                &ldquo;{milestoneToDelete.title}&rdquo;
              </strong>{" "}
              (due by {formatIndianDate(milestoneToDelete.dueAt)})? This will
              update your preparation checklist and readiness progress.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setMilestoneToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition cursor-pointer"
              >
                Keep task
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-subtle transition cursor-pointer"
              >
                {isSaving ? "Removing..." : "Remove task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
