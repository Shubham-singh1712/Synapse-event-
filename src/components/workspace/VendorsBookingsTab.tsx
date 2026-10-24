"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Sparkles,
  AlertCircle,
  Trash2,
  Edit2,
  ChevronDown,
  Scale,
  ListFilter,
  HelpCircle,
  X,
  Check,
  Tag,
  Building,
  Cake,
  Utensils,
  Camera,
  Music,
  Heart,
  Palette,
  Car,
  Gift,
  Flame,
  ShieldCheck,
} from "lucide-react";
import type { EventEntity, VendorTaskEntity, VendorTaskStatus } from "@/lib/domain/schemas";
import { formatCentsToCurrency, toCents } from "@/lib/domain/money";
import {
  toHumanVendorStatus,
  getPipelineStage,
  calculateVendorPipelineSummary,
  groupQuotesForComparison,
  INDIA_VENDOR_CATEGORIES,
  ARCHETYPE_VENDOR_SUGGESTIONS,
  type PipelineStageKey,
} from "@/lib/domain/vendors";

interface VendorsBookingsTabProps {
  event: EventEntity;
  vendorTasks: VendorTaskEntity[];
  isSaving: boolean;
  onAddVendor: (vendor: {
    category: string;
    title: string;
    requirements?: string;
    estimatedCostCents?: number;
  }) => Promise<void>;
  onUpdateVendor: (
    taskId: string,
    updates: {
      status?: VendorTaskEntity["status"];
      requirements?: string;
      title?: string;
      category?: string;
      estimatedCostCents?: number | null;
    }
  ) => Promise<void>;
  onDeleteVendor: (taskId: string) => Promise<void>;
  onShowFeedback: (type: "success" | "error", text: string) => void;
  onOpenCopilotWithPrompt?: (prompt: string) => void;
}

export function VendorsBookingsTab({
  event,
  vendorTasks,
  isSaving,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  onShowFeedback,
  onOpenCopilotWithPrompt,
}: VendorsBookingsTabProps) {
  const currency = event.currency || "INR";

  // Tab View: "pipeline" (default vendor list with visual pipeline) or "compare" (quote comparison table)
  const [activeView, setActiveView] = useState<"pipeline" | "compare">("pipeline");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStage, setSelectedStage] = useState<PipelineStageKey | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"name" | "cost_high" | "cost_low" | "recent">("recent");

  // Modal State: Add Vendor
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addCategory, setAddCategory] = useState("Catering & Sweets");
  const [addQuotedAmount, setAddQuotedAmount] = useState("");
  const [addContact, setAddContact] = useState("");
  const [addNotes, setAddNotes] = useState("");

  // Modal State: Edit Vendor
  const [editingVendor, setEditingVendor] = useState<VendorTaskEntity | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editQuotedAmount, setEditQuotedAmount] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editStatus, setEditStatus] = useState<VendorTaskStatus>("NOT_STARTED");

  // Delete Confirmation State
  const [vendorToDelete, setVendorToDelete] = useState<VendorTaskEntity | null>(null);

  // Suggestions dismissal
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Pipeline Summary
  const summary = useMemo(() => calculateVendorPipelineSummary(vendorTasks), [vendorTasks]);

  // Quote Comparisons
  const comparisons = useMemo(() => groupQuotesForComparison(vendorTasks), [vendorTasks]);
  const hasMultipleQuotesInAnyCategory = comparisons.some((c) => c.isComparable);

  // Unique categories from actual vendor tasks
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    vendorTasks.forEach((v) => {
      if (v.category) set.add(v.category.trim());
    });
    return Array.from(set).sort();
  }, [vendorTasks]);

  // Filtered & Sorted Vendors
  const filteredVendors = useMemo(() => {
    let result = [...vendorTasks];

    // Filter by stage
    if (selectedStage !== "ALL") {
      result = result.filter((v) => getPipelineStage(v.status) === selectedStage);
    }

    // Filter by category
    if (selectedCategory !== "ALL") {
      result = result.filter(
        (v) => v.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          (v.requirements && v.requirements.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "cost_high") {
        return (b.estimatedCostCents || 0) - (a.estimatedCostCents || 0);
      }
      if (sortBy === "cost_low") {
        return (a.estimatedCostCents || 0) - (b.estimatedCostCents || 0);
      }
      // default: recent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [vendorTasks, selectedStage, selectedCategory, searchQuery, sortBy]);

  // Contextual suggestions based on event archetype
  const suggestions = useMemo(() => {
    const list = ARCHETYPE_VENDOR_SUGGESTIONS[event.archetype] || ARCHETYPE_VENDOR_SUGGESTIONS["WEDDING"] || [];
    return list.filter((s) => !dismissedSuggestions.has(s.title));
  }, [event.archetype, dismissedSuggestions]);

  // Category Icon Resolver
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("cater") || cat.includes("halwai") || cat.includes("food")) return Utensils;
    if (cat.includes("cake") || cat.includes("dessert") || cat.includes("bakery")) return Cake;
    if (cat.includes("decor") || cat.includes("flower") || cat.includes("mandap")) return Palette;
    if (cat.includes("photo") || cat.includes("video") || cat.includes("cinemat")) return Camera;
    if (cat.includes("music") || cat.includes("dj") || cat.includes("dhol") || cat.includes("sound")) return Music;
    if (cat.includes("makeup") || cat.includes("styling") || cat.includes("mehendi")) return Heart;
    if (cat.includes("priest") || cat.includes("pandit") || cat.includes("ritual")) return Flame;
    if (cat.includes("transport") || cat.includes("cab") || cat.includes("car")) return Car;
    if (cat.includes("gift") || cat.includes("favor") || cat.includes("mithai")) return Gift;
    if (cat.includes("venue") || cat.includes("hall") || cat.includes("resort")) return Building;
    return Tag;
  };

  // Status Badge Color Map
  const getStatusBadgeClasses = (status: VendorTaskStatus) => {
    switch (status) {
      case "NOT_STARTED":
        return "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700";
      case "INQUIRY_SENT":
        return "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30";
      case "PROPOSAL_RECEIVED":
        return "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30";
      case "CONTRACT_SIGNED":
        return "bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-500/30";
      case "DEPOSIT_PAID":
        return "bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30";
      default:
        return "bg-surface-elevated text-secondary border-border";
    }
  };

  // Handle Add Vendor Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim()) {
      onShowFeedback("error", "Please provide a vendor or business name.");
      return;
    }

    try {
      const estimatedCostCents = addQuotedAmount ? toCents(parseFloat(addQuotedAmount) || 0) : undefined;
      let requirements = addNotes.trim();
      if (addContact.trim()) {
        requirements = requirements
          ? `Contact: ${addContact.trim()}\n${requirements}`
          : `Contact: ${addContact.trim()}`;
      }

      await onAddVendor({
        category: addCategory.trim() || "General",
        title: addTitle.trim(),
        requirements,
        estimatedCostCents,
      });

      setShowAddModal(false);
      setAddTitle("");
      setAddQuotedAmount("");
      setAddContact("");
      setAddNotes("");
    } catch {
      // Feedback handled in parent
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (v: VendorTaskEntity) => {
    setEditingVendor(v);
    setEditTitle(v.title);
    setEditCategory(v.category);
    setEditQuotedAmount(v.estimatedCostCents ? (v.estimatedCostCents / 100).toString() : "");
    setEditRequirements(v.requirements || "");
    setEditStatus(v.status);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;
    if (!editTitle.trim()) {
      onShowFeedback("error", "Vendor name cannot be empty.");
      return;
    }

    try {
      const estimatedCostCents = editQuotedAmount.trim()
        ? toCents(parseFloat(editQuotedAmount) || 0)
        : null;

      await onUpdateVendor(editingVendor.id, {
        title: editTitle.trim(),
        category: editCategory.trim() || "General",
        requirements: editRequirements.trim(),
        estimatedCostCents,
        status: editStatus,
      });

      setEditingVendor(null);
    } catch {
      // Feedback handled in parent
    }
  };

  // Quick Status Select Handler
  const handleQuickStatusChange = async (v: VendorTaskEntity, nextStatus: VendorTaskStatus) => {
    if (v.status === nextStatus) return;
    try {
      await onUpdateVendor(v.id, { status: nextStatus });
    } catch {
      // Feedback handled in parent
    }
  };

  // Add contextual suggestion
  const handleAddSuggestion = async (s: { title: string; category: string; requirements: string }) => {
    try {
      await onAddVendor({
        title: s.title,
        category: s.category,
        requirements: s.requirements,
      });
      setDismissedSuggestions((prev) => new Set([...prev, s.title]));
    } catch {
      // Feedback handled in parent
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* =========================================================================
          1. EDITORIAL HEADER & PRIMARY ACTIONS
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-primary tracking-tight">
              Vendors &amp; Bookings
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-aubergine/10 dark:bg-champagne/15 text-aubergine dark:text-champagne border border-aubergine/20 dark:border-champagne/30">
              {summary.activeVendorsCount} active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
            Keep track of the people helping make your celebration special.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle: Pipeline vs Quote Comparison */}
          <div className="inline-flex rounded-xl bg-surface-elevated p-1 border border-border shadow-inner-subtle">
            <button
              onClick={() => setActiveView("pipeline")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeView === "pipeline"
                  ? "bg-surface text-primary shadow-subtle border border-border/60"
                  : "text-muted hover:text-primary"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Pipeline &amp; List</span>
            </button>
            <button
              onClick={() => setActiveView("compare")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeView === "compare"
                  ? "bg-surface text-primary shadow-subtle border border-border/60"
                  : "text-muted hover:text-primary"
              }`}
              title="Compare quotes side-by-side"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Quote Comparison</span>
              {hasMultipleQuotesInAnyCategory && (
                <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCopilotWithPrompt && (
              <button
                onClick={() =>
                  onOpenCopilotWithPrompt(
                    `Review and compare my vendor pipeline and quotes for "${event.title}". Summarize price trade-offs, identify unclear inclusions, and suggest questions to ask.`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-champagne/40 hover:border-champagne text-primary font-serif font-medium text-xs transition shadow-subtle hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-coral" />
                <span>AI Quote Advisor</span>
              </button>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aubergine dark:bg-champagne hover:bg-aubergine-dark dark:hover:bg-champagne-dark text-white dark:text-aubergine font-medium text-xs sm:text-sm transition shadow-subtle"
            >
              <Plus className="w-4 h-4" />
              <span>Add a Vendor</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. VISUAL BOOKING PIPELINE SUMMARY
         ========================================================================= */}
      <div className="bg-surface/90 border border-border/80 rounded-2xl p-5 sm:p-6 shadow-subtle space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Financial summary overview */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <span className="text-[11px] font-sans text-muted uppercase tracking-wider block">
                Total Quoted Price
              </span>
              <span className="font-serif text-xl sm:text-2xl font-normal text-primary">
                {formatCentsToCurrency(summary.totalQuotedCents, currency)}
              </span>
            </div>
            <div className="h-8 w-px bg-border/80 hidden sm:block" />
            <div>
              <span className="text-[11px] font-sans text-muted uppercase tracking-wider block">
                Confirmed Bookings
              </span>
              <span className="font-serif text-xl sm:text-2xl font-normal text-purple-700 dark:text-purple-300">
                {formatCentsToCurrency(summary.totalBookedCents, currency)}
              </span>
            </div>
            <div className="h-8 w-px bg-border/80 hidden sm:block" />
            <div>
              <span className="text-[11px] font-sans text-muted uppercase tracking-wider block">
                Quotes Pending
              </span>
              <span className="font-serif text-xl sm:text-2xl font-normal text-amber-700 dark:text-amber-300">
                {summary.pendingQuotesCount}
              </span>
            </div>
          </div>

          {/* Educational distinction */}
          <div className="p-2.5 rounded-xl bg-champagne/10 border border-champagne/25 text-[11px] text-secondary/90 max-w-sm flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-champagne shrink-0 mt-0.5" />
            <span>
              <strong>Smart Financials:</strong> Quoted prices represent vendor estimates. Marking a vendor as booked tracks your confirmed agreements without double-counting your budget ledger.
            </span>
          </div>
        </div>

        {/* Visual Pipeline Stages Bar */}
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {summary.stages.map((stage) => {
              const isSelected = selectedStage === stage.key;
              return (
                <button
                  key={stage.key}
                  onClick={() => setSelectedStage(isSelected ? "ALL" : stage.key)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-champagne border-champagne bg-surface-elevated shadow-subtle"
                      : `${stage.borderClass} ${stage.bgLightClass} hover:opacity-90`
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-xs font-semibold ${stage.colorClass}`}>
                      {stage.shortLabel}
                    </span>
                    <span
                      className={`text-xs font-bold px-1.5 py-0.2 rounded-full ${
                        stage.count > 0 ? "bg-white/80 dark:bg-black/40 shadow-xs" : "opacity-50"
                      } ${stage.colorClass}`}
                    >
                      {stage.count}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted line-clamp-1">
                    {stage.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reset stage filter button if active */}
          {selectedStage !== "ALL" && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-secondary">
                Filtered by stage: <strong>{toHumanVendorStatus(
                  selectedStage === "TO_CONTACT"
                    ? "NOT_STARTED"
                    : selectedStage === "CONTACTED"
                    ? "INQUIRY_SENT"
                    : selectedStage === "QUOTE_RECEIVED"
                    ? "PROPOSAL_RECEIVED"
                    : selectedStage === "BOOKED"
                    ? "DEPOSIT_PAID"
                    : "COMPLETED"
                )}</strong>
              </span>
              <button
                onClick={() => setSelectedStage("ALL")}
                className="text-xs text-coral hover:underline"
              >
                Clear stage filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW A: QUOTE COMPARISON VIEW (When toggle is active)
         ========================================================================= */}
      {activeView === "compare" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-normal text-primary">
                Category Quote Comparison
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Compare multiple proposals side-by-side to make confident celebration decisions.
              </p>
            </div>
          </div>

          {comparisons.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface/50 border border-dashed border-border space-y-3">
              <Scale className="w-10 h-10 text-muted mx-auto opacity-40" />
              <h4 className="font-serif text-lg font-normal text-primary">No quotes to compare yet</h4>
              <p className="text-xs text-muted max-w-md mx-auto">
                Add vendors in the same category (e.g. 2 caterers or 2 decorators) with quoted prices to unlock side-by-side comparisons.
              </p>
              <button
                onClick={() => {
                  setActiveView("pipeline");
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Vendor</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {comparisons.map((c) => (
                <div
                  key={c.category}
                  className="rounded-2xl bg-surface/90 border border-border/80 shadow-subtle overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="px-5 py-4 border-b border-border/70 bg-surface-elevated/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {React.createElement(getCategoryIcon(c.category), {
                        className: "w-4 h-4 text-champagne",
                      })}
                      <h4 className="font-serif text-lg font-medium text-primary">
                        {c.category}
                      </h4>
                      <span className="text-xs text-muted">
                        ({c.vendorCount} {c.vendorCount === 1 ? "vendor" : "vendors"})
                      </span>
                    </div>

                    {c.isComparable && c.quoteDiffCents !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Price spread:</span>
                        <span className="text-xs font-serif font-medium text-coral bg-coral/10 px-2.5 py-0.5 rounded-full border border-coral/30">
                          {formatCentsToCurrency(c.quoteDiffCents, currency)} difference
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Context notice regarding inclusions */}
                  {c.isComparable && (
                    <div className="px-5 py-2.5 bg-champagne/5 border-b border-champagne/15 text-[11px] text-muted flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-champagne shrink-0" />
                      <span>
                        Prices may cover different inclusions, ingredients, or hours. The lowest price is not always the best value. Compare services carefully.
                      </span>
                    </div>
                  )}

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/70">
                    {c.vendors.map((v) => {
                      const isBooked = v.status === "CONTRACT_SIGNED" || v.status === "DEPOSIT_PAID";
                      return (
                        <div key={v.id} className="p-5 space-y-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider border ${getStatusBadgeClasses(
                                  v.status
                                )}`}
                              >
                                {toHumanVendorStatus(v.status)}
                              </span>
                              {isBooked && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                                  <Check className="w-3.5 h-3.5" /> Booked
                                </span>
                              )}
                            </div>

                            <h5 className="font-serif text-lg font-normal text-primary">
                              {v.title}
                            </h5>

                            <div className="mt-3 p-3 rounded-xl bg-surface-elevated/70 border border-border/70 space-y-1">
                              <span className="text-[10px] text-muted uppercase tracking-wider block">
                                Quoted Price
                              </span>
                              <div className="font-serif text-xl font-medium text-primary">
                                {v.estimatedCostCents ? (
                                  formatCentsToCurrency(v.estimatedCostCents, currency)
                                ) : (
                                  <span className="text-xs text-muted italic font-sans">
                                    Quote Pending
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 space-y-1">
                              <span className="text-[11px] font-medium text-secondary block">
                                Inclusions &amp; Notes:
                              </span>
                              <p className="text-xs text-muted leading-relaxed whitespace-pre-line">
                                {v.requirements || "No details or contact notes added yet."}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border/70 flex items-center justify-between">
                            <button
                              onClick={() => handleOpenEdit(v)}
                              className="text-xs text-champagne hover:underline flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit proposal
                            </button>
                            <button
                              onClick={() =>
                                handleQuickStatusChange(
                                  v,
                                  isBooked ? "PROPOSAL_RECEIVED" : "DEPOSIT_PAID"
                                )
                              }
                              disabled={isSaving}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                isBooked
                                  ? "bg-surface-elevated text-secondary border border-border hover:bg-page"
                                  : "bg-purple-600 hover:bg-purple-700 text-white"
                              }`}
                            >
                              {isBooked ? "Reopen quote" : "Confirm booking"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW B: PIPELINE & LIST VIEW
         ========================================================================= */}
      {activeView === "pipeline" && (
        <div className="space-y-6">
          {/* Controls: Search, Category Filter, and Sorting */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendors by name, category, or notes..."
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

            <div className="flex items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                <option value="ALL">All Categories</option>
                {existingCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "name" | "cost_high" | "cost_low" | "recent")
                }
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                <option value="recent">Recently Added</option>
                <option value="cost_high">Quoted Price: High to Low</option>
                <option value="cost_low">Quoted Price: Low to High</option>
                <option value="name">Vendor Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Vendor Cards Grid */}
          {filteredVendors.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface/60 border border-dashed border-border space-y-3">
              <Users className="w-10 h-10 text-muted mx-auto opacity-40" />
              <h4 className="font-serif text-lg font-normal text-primary">No vendors found</h4>
              <p className="text-xs text-muted max-w-sm mx-auto">
                {searchQuery || selectedCategory !== "ALL" || selectedStage !== "ALL"
                  ? "Try clearing your search or filters to see all vendors."
                  : "Start by adding the caterer, decorator, photographer, or venue for your celebration."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                  setSelectedStage("ALL");
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a Vendor</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVendors.map((v) => {
                const CategoryIcon = getCategoryIcon(v.category);

                return (
                  <div
                    key={v.id}
                    className="p-5 rounded-2xl bg-surface/85 border border-border/80 hover:border-champagne/45 shadow-subtle flex flex-col justify-between space-y-4 transition"
                  >
                    <div>
                      {/* Category & Status header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <CategoryIcon className="w-3.5 h-3.5 text-champagne" />
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider bg-aubergine/10 dark:bg-champagne/15 text-aubergine dark:text-champagne border border-aubergine/20 dark:border-champagne/30">
                            {v.category}
                          </span>
                        </div>

                        {/* Explicit Status Selector */}
                        <div className="relative inline-block">
                          <select
                            value={v.status}
                            onChange={(e) =>
                              handleQuickStatusChange(v, e.target.value as VendorTaskStatus)
                            }
                            disabled={isSaving}
                            className={`text-xs font-sans font-medium py-1 pl-2.5 pr-6 rounded-full border cursor-pointer appearance-none transition focus:outline-none focus:ring-1 focus:ring-champagne ${getStatusBadgeClasses(
                              v.status
                            )}`}
                            title="Click to select status"
                          >
                            <option value="NOT_STARTED">To contact</option>
                            <option value="INQUIRY_SENT">Contacted</option>
                            <option value="PROPOSAL_RECEIVED">Quote received</option>
                            <option value="CONTRACT_SIGNED">Contract signed</option>
                            <option value="DEPOSIT_PAID">Booked</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Declined</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-current absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      </div>

                      {/* Vendor Name */}
                      <h3 className="font-serif text-lg sm:text-xl font-normal text-primary">
                        {v.title}
                      </h3>

                      {/* Quoted Price Display */}
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-[11px] text-muted uppercase tracking-wider">
                          Quoted Price:
                        </span>
                        {v.estimatedCostCents ? (
                          <span className="font-serif text-base sm:text-lg font-medium text-primary">
                            {formatCentsToCurrency(v.estimatedCostCents, currency)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted italic">Quote Pending</span>
                        )}
                      </div>

                      {/* Inclusions & Contact Details */}
                      {v.requirements && (
                        <div className="mt-3 p-3 rounded-xl bg-surface-elevated/60 border border-border/70 text-xs text-muted leading-relaxed whitespace-pre-line">
                          {v.requirements}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/70">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-surface-elevated transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setVendorToDelete(v)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-surface-elevated transition"
                        title="Remove vendor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =========================================================================
              3. INDIAN CELEBRATION VENDOR SUGGESTIONS (Tailored by Archetype)
             ========================================================================= */}
          {suggestions.length > 0 && (
            <div className="pt-6 border-t border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-normal text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-champagne" />
                    <span>Recommended Vendors for Your {event.archetype === "WEDDING" ? "Wedding" : event.archetype === "BIRTHDAY" ? "Birthday" : "Celebration"}</span>
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Common vendor partners trusted for Indian celebrations. Add any vendor with one click to keep your planning organized.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.slice(0, 6).map((s) => (
                  <div
                    key={s.title}
                    className="p-4 rounded-xl bg-surface/70 border border-champagne/25 hover:border-champagne/50 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-champagne">
                          {s.category}
                        </span>
                      </div>
                      <h4 className="font-serif text-base font-normal text-primary">{s.title}</h4>
                      <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                        {s.requirements}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <button
                        onClick={() => handleAddSuggestion(s)}
                        disabled={isSaving}
                        className="text-xs font-medium text-coral hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add to Vendors
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
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD A VENDOR MODAL
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-border shadow-atelier space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-serif text-2xl font-normal text-primary">Add a Vendor</h3>
                <p className="text-xs text-muted mt-0.5">
                  Keep track of quotes, contact details, and agreements.
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
                  Vendor or Business Name <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g., Rajesh Caterers, Shubh Mandap Decorators"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Category <span className="text-coral">*</span>
                  </label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  >
                    {INDIA_VENDOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Quoted Price ({currency === "INR" ? "₹ INR" : currency})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={addQuotedAmount}
                    onChange={(e) => setAddQuotedAmount(e.target.value)}
                    placeholder="e.g., 85000 (optional)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Contact Person &amp; Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={addContact}
                  onChange={(e) => setAddContact(e.target.value)}
                  placeholder="e.g., Rajesh Sharma - 98200 XXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Inclusions, Package Notes &amp; Follow-up Details
                </label>
                <textarea
                  rows={3}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="e.g., Pure vegetarian buffet with 3 live counters; includes 10 service staff and cleaning."
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
                  {isSaving ? "Saving..." : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT VENDOR MODAL
         ========================================================================= */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-border shadow-atelier space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-serif text-2xl font-normal text-primary">Edit Vendor</h3>
                <p className="text-xs text-muted mt-0.5">
                  Update quoted pricing, status, and contract notes.
                </p>
              </div>
              <button
                onClick={() => setEditingVendor(null)}
                className="p-1 rounded-lg text-muted hover:text-primary transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Vendor or Business Name <span className="text-coral">*</span>
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
                    Category <span className="text-coral">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Quoted Price ({currency === "INR" ? "₹ INR" : currency})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editQuotedAmount}
                    onChange={(e) => setEditQuotedAmount(e.target.value)}
                    placeholder="Leave empty if pending"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Booking Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as VendorTaskStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne"
                >
                  <option value="NOT_STARTED">To contact</option>
                  <option value="INQUIRY_SENT">Contacted</option>
                  <option value="PROPOSAL_RECEIVED">Quote received</option>
                  <option value="CONTRACT_SIGNED">Contract signed</option>
                  <option value="DEPOSIT_PAID">Booked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Inclusions, Contact Details &amp; Notes
                </label>
                <textarea
                  rows={4}
                  value={editRequirements}
                  onChange={(e) => setEditRequirements(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-champagne leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVendor(null)}
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
      {vendorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full border border-border shadow-atelier space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif text-xl font-normal text-primary">Remove Vendor?</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Are you sure you want to remove <strong>&ldquo;{vendorToDelete.title}&rdquo;</strong>? This will permanently delete this vendor record and their quote.
            </p>
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                onClick={() => setVendorToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-secondary hover:text-primary transition"
              >
                Keep Vendor
              </button>
              <button
                onClick={async () => {
                  try {
                    await onDeleteVendor(vendorToDelete.id);
                    setVendorToDelete(null);
                  } catch {
                    // Handled in parent
                  }
                }}
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
