"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Sparkles,
  Heart,
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Receipt,
  CalendarCheck,
  Palette,
  Eye,
  DollarSign,
  UtensilsCrossed,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import type { EventEntity, IdeaItemEntity } from "@/lib/domain/schemas";
import { formatCentsToCurrency } from "@/lib/domain/money";
import {
  CURATED_INSPIRATION_THEMES,
  INSPIRATION_CATEGORIES,
  filterInspirationThemes,
  formatCostRange,
  adaptDbIdeasToInspiration,
  type InspirationCategory,
  type InspirationTheme,
} from "@/lib/domain/inspiration";

interface Props {
  event: EventEntity;
  dbIdeas: IdeaItemEntity[];
  currency: string;
  currencySymbol: string;
  isSaving: boolean;
  onConvertIdea: (ideaId: string, asType: "BUDGET" | "TASK") => Promise<void>;
  onAddDirectBudget: (item: {
    category: string;
    description: string;
    estimatedCostCents: number;
    actualCostCents?: number;
    status?: "ESTIMATED" | "QUOTED" | "COMMITTED" | "PAID" | "CANCELLED";
    isGuestSensitive?: boolean;
  }) => Promise<void>;
  onAddDirectTask: (vendor: {
    category: string;
    title: string;
    requirements?: string;
    estimatedCostCents?: number;
  }) => Promise<void>;
  showFeedback: (type: "success" | "error", text: string) => void;
}

/**
 * Resilient Image Component with automatic fallback to elegant artistic placeholder
 * Prevents broken image icons or failed network requests from disrupting the gallery.
 */
function InspirationImage({
  src,
  alt,
  className = "",
  fill = false,
  width,
  height,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-champagne/20 via-coral/10 to-aubergine/10 flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <Sparkles className="w-8 h-8 text-champagne/70 mb-2 animate-pulse" />
        <span className="font-serif text-sm font-medium text-primary">
          Celebration Visual Atelier
        </span>
        <span className="text-[11px] text-muted line-clamp-1 mt-1 max-w-[200px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${fill ? "w-full h-full" : ""}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-surface-elevated animate-pulse flex items-center justify-center z-10">
          <Sparkles className="w-5 h-5 text-champagne/40" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={`object-cover transition-transform duration-700 hover:scale-105 ${className} ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function InspirationStudioTab({
  event,
  dbIdeas,
  currency,
  currencySymbol,
  isSaving,
  onConvertIdea,
  onAddDirectBudget,
  onAddDirectTask,
  showFeedback,
}: Props) {
  // 1. Search & Filter State
  const [selectedCategory, setSelectedCategory] =
    useState<InspirationCategory>("All Ideas");
  const [searchQuery, setSearchQuery] = useState("");
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // 2. Active Detail View (Moodboard Modal)
  const [activeMoodboard, setActiveMoodboard] =
    useState<InspirationTheme | null>(null);

  // 3. Confirmation Dialogs
  const [budgetConfirmTheme, setBudgetConfirmTheme] =
    useState<InspirationTheme | null>(null);
  const [taskConfirmTheme, setTaskConfirmTheme] =
    useState<InspirationTheme | null>(null);

  // Form states for confirmation
  const [confirmBudgetCategory, setConfirmBudgetCategory] = useState("");
  const [confirmBudgetAmount, setConfirmBudgetAmount] = useState("");
  const [confirmTaskTitle, setConfirmTaskTitle] = useState("");
  const [confirmTaskCategory, setConfirmTaskCategory] = useState("");

  // 4. Preferences Drawer
  const [showPreferences, setShowPreferences] = useState(false);
  const [dietaryVibe, setDietaryVibe] = useState<"VEG" | "NON_VEG" | "JAIN">(
    "VEG"
  );
  const [stylePreference, setStylePreference] = useState<string>("ALL");

  // Load favourites from localStorage safely on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`synapse_favs_${event.id}`);
      if (stored) {
        setFavouriteIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [event.id]);

  // Persist favourites to localStorage
  const toggleFavourite = (themeId: string) => {
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) {
        next.delete(themeId);
        showFeedback("success", "Removed from Favourites.");
      } else {
        next.add(themeId);
        showFeedback("success", "Saved to Favourites.");
      }
      try {
        localStorage.setItem(
          `synapse_favs_${event.id}`,
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Ignore localStorage write errors
      }
      return next;
    });
  };

  const handleDismissTheme = (themeId: string) => {
    setDismissedIds((prev) => new Set([...prev, themeId]));
    showFeedback("success", "Theme dismissed. You can reset filters to view again.");
  };

  // Combine curated themes with user/AI database ideas
  const allThemes = useMemo(() => {
    const adaptedDb = adaptDbIdeasToInspiration(dbIdeas, event.archetype);
    // Combine and deduplicate
    const combined = [...CURATED_INSPIRATION_THEMES, ...adaptedDb];
    return combined.filter((t) => !dismissedIds.has(t.id));
  }, [dbIdeas, event.archetype, dismissedIds]);

  // Filter themes
  const filteredThemes = useMemo(() => {
    let list = filterInspirationThemes(
      allThemes,
      selectedCategory,
      searchQuery,
      favouriteIds
    );

    if (stylePreference !== "ALL") {
      list = list.filter((t) =>
        t.tags.some(
          (tag) => tag.toLowerCase() === stylePreference.toLowerCase()
        )
      );
    }

    return list;
  }, [allThemes, selectedCategory, searchQuery, favouriteIds, stylePreference]);

  // Launch confirmation for Add to Budget
  const openBudgetConfirmation = (theme: InspirationTheme) => {
    setBudgetConfirmTheme(theme);
    setConfirmBudgetCategory(theme.category || "Themes & Decor");
    const defaultCost = theme.estimatedCostRange
      ? Math.round(theme.estimatedCostRange.minCents / 100).toString()
      : "15000";
    setConfirmBudgetAmount(defaultCost);
  };

  // Launch confirmation for Add to Task
  const openTaskConfirmation = (theme: InspirationTheme) => {
    setTaskConfirmTheme(theme);
    setConfirmTaskTitle(`[Theme] ${theme.title}`);
    setConfirmTaskCategory(theme.category || "Themes & Decor");
  };

  // Execute Add to Budget
  const handleConfirmAddToBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetConfirmTheme) return;

    const amountDollars = parseFloat(confirmBudgetAmount) || 0;
    const amountCents = Math.round(amountDollars * 100);

    try {
      // Check if it's a DB idea already
      const isDbIdea = dbIdeas.some((i) => i.id === budgetConfirmTheme.id);
      if (isDbIdea) {
        await onConvertIdea(budgetConfirmTheme.id, "BUDGET");
      } else {
        await onAddDirectBudget({
          category: confirmBudgetCategory,
          description: `[Inspiration] ${budgetConfirmTheme.title}: ${budgetConfirmTheme.tagline}`,
          estimatedCostCents: amountCents,
          actualCostCents: 0,
          status: "ESTIMATED",
          isGuestSensitive: false,
        });
      }

      setBudgetConfirmTheme(null);
      showFeedback(
        "success",
        `"${budgetConfirmTheme.title}" added to your Budget Ledger.`
      );
    } catch {
      showFeedback("error", "Failed to add budget entry. Please try again.");
    }
  };

  // Execute Add to Tasks
  const handleConfirmAddToTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskConfirmTheme) return;

    try {
      const isDbIdea = dbIdeas.some((i) => i.id === taskConfirmTheme.id);
      if (isDbIdea) {
        await onConvertIdea(taskConfirmTheme.id, "TASK");
      } else {
        await onAddDirectTask({
          category: confirmTaskCategory,
          title: confirmTaskTitle,
          requirements: `${taskConfirmTheme.description}\n\nChecklist:\n${taskConfirmTheme.arrangementsChecklist.join(
            "\n"
          )}`,
          estimatedCostCents: taskConfirmTheme.estimatedCostRange?.minCents,
        });
      }

      setTaskConfirmTheme(null);
      showFeedback(
        "success",
        `"${taskConfirmTheme.title}" added to your Plan & Checklist.`
      );
    } catch {
      showFeedback("error", "Failed to add task. Please try again.");
    }
  };

  return (
    <div className="space-y-7 animate-fade-in text-primary">
      {/* =========================================================================
          SECTION 1: PAGE HEADER & INSPIRATION HERO
         ========================================================================= */}
      <div className="bg-surface/85 backdrop-blur-sm border border-border/80 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-5 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-champagne/15 via-coral/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-sans font-semibold tracking-wider uppercase text-coral">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Celebration Inspiration Studio</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-primary tracking-tight">
              Find Your Celebration Style
            </h2>
            <p className="text-xs sm:text-sm text-secondary/90 leading-relaxed font-sans">
              Discover beautiful ideas for your celebration, save your
              favourites, and turn inspiration into a plan.
            </p>
          </div>

          {/* Quick Stats & Favourites Pill */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setSelectedCategory("My Favourites")}
              className={`px-4 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition shadow-subtle ${
                selectedCategory === "My Favourites"
                  ? "bg-coral text-white border-coral"
                  : "bg-surface hover:bg-page border-border text-secondary"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  selectedCategory === "My Favourites"
                    ? "fill-white text-white"
                    : "text-coral"
                }`}
              />
              <span>Favourites</span>
              <span className="font-mono text-[11px] bg-black/10 px-1.5 py-0.2 rounded-full">
                {favouriteIds.size}
              </span>
            </button>

            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="px-3.5 py-2 rounded-xl bg-surface hover:bg-page border border-border text-secondary hover:text-primary text-xs font-medium flex items-center gap-2 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-champagne" />
              <span>Style Preferences</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Navigation */}
        <div className="space-y-4 pt-4 border-t border-border/80">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ideas by theme, decor, food, photography, or cake..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-page border border-border rounded-xl text-xs text-primary placeholder:text-muted focus:outline-none focus:border-coral transition"
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

            {/* Clear / Reset button if filters active */}
            {(selectedCategory !== "All Ideas" ||
              searchQuery ||
              stylePreference !== "ALL") && (
              <button
                onClick={() => {
                  setSelectedCategory("All Ideas");
                  setSearchQuery("");
                  setStylePreference("ALL");
                }}
                className="text-xs text-muted hover:text-primary flex items-center gap-1 shrink-0 px-2 py-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar select-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {INSPIRATION_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition text-xs font-sans font-medium flex items-center gap-1.5 ${
                    isActive
                      ? "bg-aubergine text-white dark:bg-champagne dark:text-aubergine shadow-subtle"
                      : "bg-page/70 hover:bg-surface border border-border/70 text-secondary hover:text-primary"
                  }`}
                >
                  {cat === "My Favourites" && (
                    <Heart
                      className={`w-3 h-3 ${
                        isActive ? "fill-current" : "text-coral"
                      }`}
                    />
                  )}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Preferences Panel */}
        {showPreferences && (
          <div className="p-4 rounded-2xl bg-page/80 border border-champagne/30 text-xs space-y-3 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="font-serif font-medium text-primary text-sm flex items-center gap-2">
                <Palette className="w-4 h-4 text-coral" />
                <span>Personalize Your Inspiration Studio</span>
              </span>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-muted hover:text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-muted block mb-1 font-medium">
                  Catering &amp; Dietary Focus
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDietaryVibe("VEG")}
                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                      dietaryVibe === "VEG"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-surface border-border text-secondary"
                    }`}
                  >
                    Vegetarian Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietaryVibe("JAIN")}
                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                      dietaryVibe === "JAIN"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-surface border-border text-secondary"
                    }`}
                  >
                    Jain / Sattvic
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietaryVibe("NON_VEG")}
                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                      dietaryVibe === "NON_VEG"
                        ? "bg-coral text-white border-coral"
                        : "bg-surface border-border text-secondary"
                    }`}
                  >
                    Mixed Menu
                  </button>
                </div>
              </div>

              <div>
                <label className="text-muted block mb-1 font-medium">
                  Style Vibe
                </label>
                <select
                  value={stylePreference}
                  onChange={(e) => setStylePreference(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-primary text-xs focus:outline-none focus:border-coral"
                >
                  <option value="ALL">All Aesthetics</option>
                  <option value="Garden">Garden &amp; Botanical</option>
                  <option value="Traditional">Traditional Indian &amp; Festive</option>
                  <option value="Carnival">Bollywood &amp; Carnival</option>
                  <option value="Pastel">Soft Pastel Fairytale</option>
                  <option value="Safari">Jungle Safari</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: EDITORIAL MASONRY INSPIRATION GALLERY
         ========================================================================= */}
      {filteredThemes.length === 0 ? (
        <div className="bg-surface/60 border border-dashed border-border/80 rounded-3xl p-12 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-champagne/60 mx-auto" />
          <h3 className="font-serif text-lg font-medium text-primary">
            No celebration ideas found
          </h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            {selectedCategory === "My Favourites"
              ? "You haven't saved any favourites yet. Browse the studio and click the heart icon on any style you love!"
              : "Try adjusting your search keywords or resetting the category filter."}
          </p>
          <button
            onClick={() => {
              setSelectedCategory("All Ideas");
              setSearchQuery("");
              setStylePreference("ALL");
            }}
            className="px-4 py-2 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine text-xs font-medium transition"
          >
            Show All Ideas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map((theme, index) => {
            const isFav = favouriteIds.has(theme.id);
            const isFeatured = index === 0 && selectedCategory === "All Ideas";

            return (
              <div
                key={theme.id}
                className={`group rounded-3xl bg-surface/80 border border-border/80 hover:border-champagne/60 transition-all duration-300 shadow-subtle hover:shadow-atelier flex flex-col justify-between overflow-hidden relative ${
                  isFeatured ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                {/* Visual Image Header */}
                <div
                  className={`relative w-full overflow-hidden cursor-pointer ${
                    isFeatured ? "h-64 sm:h-80" : "h-56"
                  }`}
                  onClick={() => setActiveMoodboard(theme)}
                >
                  <InspirationImage
                    src={theme.heroImage}
                    alt={theme.heroAlt}
                    fill
                    priority={index < 2}
                  />

                  {/* Top Badges Overlay */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {theme.category}
                    </span>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissTheme(theme.id);
                        }}
                        className="p-2 rounded-full backdrop-blur-md bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition shadow-md"
                        title="Dismiss recommendation"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavourite(theme.id);
                        }}
                        className={`p-2 rounded-full backdrop-blur-md transition shadow-md ${
                          isFav
                            ? "bg-coral text-white scale-110"
                            : "bg-black/50 text-white/90 hover:text-coral hover:bg-black/70"
                        }`}
                        title={isFav ? "Saved to Favourites" : "Save to Favourites"}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isFav ? "fill-white" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Gradient Scrim for subtle title readability on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                  {/* Overlay Title on Large Hero */}
                  <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none">
                    <span className="text-[11px] font-serif italic text-champagne block line-clamp-1">
                      {theme.tagline}
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-normal text-white tracking-tight leading-snug drop-shadow-sm">
                      {theme.title}
                    </h3>
                  </div>
                </div>

                {/* Card Content & Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <p className="text-xs text-secondary/90 leading-relaxed line-clamp-2">
                      {theme.description}
                    </p>

                    {/* Visual Color Palette Swatches */}
                    {theme.colorPalette.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono text-muted mr-1">
                          Palette:
                        </span>
                        {theme.colorPalette.slice(0, 5).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-125"
                            style={{ backgroundColor: color.hex }}
                            title={`${color.name} (${color.hex})`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Cost Range Indicator (Budget-Aware) */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                      <span className="text-muted text-[11px]">
                        Estimated Investment:
                      </span>
                      <span className="font-mono text-secondary text-xs font-medium">
                        {formatCostRange(theme.estimatedCostRange, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Hub */}
                  <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setActiveMoodboard(theme)}
                      className="inline-flex items-center gap-1.5 text-xs text-coral hover:text-coral-hover font-semibold transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Explore Moodboard</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openTaskConfirmation(theme)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg bg-surface hover:bg-page border border-border text-secondary hover:text-primary transition"
                        title="Add to Plan & Checklist"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openBudgetConfirmation(theme)}
                        disabled={isSaving}
                        className="px-2.5 py-1.5 rounded-lg bg-coral/10 hover:bg-coral/20 border border-coral/30 text-coral text-xs font-medium flex items-center gap-1 transition"
                        title="Add to Budget Ledger"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Budget</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          SECTION 3: VISUAL MOODBOARD DETAIL MODAL
         ========================================================================= */}
      {activeMoodboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-surface border border-champagne/40 rounded-3xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="relative h-64 sm:h-72 w-full shrink-0">
              <InspirationImage
                src={activeMoodboard.heroImage}
                alt={activeMoodboard.heroAlt}
                fill
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

              {/* Close Button */}
              <button
                onClick={() => setActiveMoodboard(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition z-30"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Top Category Badge */}
              <div className="absolute top-4 left-4 z-20">
                <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/30">
                  {activeMoodboard.category}
                </span>
              </div>

              {/* Hero Title & Tagline */}
              <div className="absolute bottom-5 left-6 right-6 z-20 text-white space-y-1">
                <span className="text-xs font-serif italic text-champagne">
                  {activeMoodboard.tagline}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-tight">
                  {activeMoodboard.title}
                </h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto text-xs">
              {/* Overview & Why It Fits */}
              <div className="space-y-3">
                <h3 className="font-serif text-base font-normal text-primary">
                  Creative Direction &amp; Concept
                </h3>
                <p className="text-secondary/90 leading-relaxed text-sm">
                  {activeMoodboard.description}
                </p>

                {activeMoodboard.whyItFits && (
                  <div className="p-4 rounded-2xl bg-champagne/10 border border-champagne/30 text-xs space-y-1">
                    <span className="font-serif font-medium text-secondary block text-sm">
                      Why this fits your celebration:
                    </span>
                    <p className="text-muted leading-relaxed">
                      {activeMoodboard.whyItFits}
                    </p>
                  </div>
                )}
              </div>

              {/* Complementary Gallery Shots */}
              {activeMoodboard.galleryImages.length > 0 && (
                <div className="space-y-2">
                  <span className="font-serif text-sm font-medium text-primary block">
                    Inspiration Gallery &amp; Vignettes
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeMoodboard.galleryImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-border/70 relative h-28 group"
                      >
                        <InspirationImage
                          src={img.url}
                          alt={img.alt}
                          fill
                        />
                        {img.caption && (
                          <div className="absolute inset-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                            <span className="text-[10px] text-white leading-tight">
                              {img.caption}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinated Color Palette Swatches */}
              <div className="space-y-2.5">
                <span className="font-serif text-sm font-medium text-primary block">
                  Coordinated Color Palette
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {activeMoodboard.colorPalette.map((swatch, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-page/70 border border-border/80 flex flex-col items-center text-center space-y-1.5"
                    >
                      <div
                        className="w-8 h-8 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="font-medium text-primary text-[11px] line-clamp-1">
                        {swatch.name}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {swatch.hex}
                      </span>
                      <span className="text-[9px] text-secondary/70 uppercase tracking-wider">
                        {swatch.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Atmosphere & Mood */}
              {activeMoodboard.atmosphere && (
                <div className="p-4 rounded-2xl bg-surface-elevated border border-border/70 space-y-1">
                  <span className="font-serif text-sm font-medium text-primary block">
                    Celebration Atmosphere
                  </span>
                  <p className="text-muted leading-relaxed">
                    {activeMoodboard.atmosphere}
                  </p>
                </div>
              )}

              {/* Key Arrangements & Inclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="font-serif text-sm font-medium text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>What This Look Includes</span>
                  </span>
                  <ul className="space-y-1.5 text-secondary/90">
                    {activeMoodboard.inclusions.map((inc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-coral font-bold">•</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="font-serif text-sm font-medium text-primary flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-champagne" />
                    <span>Planning &amp; Setup Tasks</span>
                  </span>
                  <ul className="space-y-1.5 text-secondary/90">
                    {activeMoodboard.arrangementsChecklist.map((task, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-champagne font-bold">•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Food & Beverage Ideas (if available) */}
              {activeMoodboard.foodIdeas && (
                <div className="p-4 rounded-2xl bg-page/70 border border-border/70 space-y-2">
                  <span className="font-serif text-sm font-medium text-primary flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-coral" />
                    <span>Curated Food &amp; Refreshment Ideas</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted">
                    {activeMoodboard.foodIdeas.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-coral">→</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget-Aware Considerations & Upgrades */}
              <div className="p-4 rounded-2xl bg-aubergine/5 dark:bg-white/5 border border-champagne/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-serif text-sm font-medium text-primary flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-champagne" />
                    <span>Estimated Investment &amp; Upgrades</span>
                  </span>
                  <span className="font-mono font-medium text-primary text-sm">
                    {formatCostRange(activeMoodboard.estimatedCostRange, currency)}
                  </span>
                </div>

                {activeMoodboard.optionalUpgrades && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-secondary block">
                      Optional Upgrades:
                    </span>
                    {activeMoodboard.optionalUpgrades.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs text-muted"
                      >
                        <span>• {u.title}</span>
                        <span className="font-mono text-secondary">
                          +{formatCentsToCurrency(u.costCents, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeMoodboard.budgetFriendlyAlternative && (
                  <div className="pt-2 text-[11px] text-muted border-t border-border/50 italic">
                    <strong>Budget-Friendly Tip:</strong>{" "}
                    {activeMoodboard.budgetFriendlyAlternative}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-border/80 bg-surface-elevated flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => toggleFavourite(activeMoodboard.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition ${
                  favouriteIds.has(activeMoodboard.id)
                    ? "bg-coral text-white border-coral"
                    : "bg-surface hover:bg-page border-border text-secondary"
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    favouriteIds.has(activeMoodboard.id) ? "fill-white" : ""
                  }`}
                />
                <span>
                  {favouriteIds.has(activeMoodboard.id)
                    ? "Saved to Favourites"
                    : "Save to Favourites"}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openTaskConfirmation(activeMoodboard);
                    setActiveMoodboard(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-surface border border-border hover:border-champagne text-secondary hover:text-primary text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-champagne" />
                  <span>+ Add to Checklist</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openBudgetConfirmation(activeMoodboard);
                    setActiveMoodboard(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-subtle transition"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>+ Add to Budget Ledger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: CONFIRMATION MODAL — ADD TO BUDGET LEDGER
         ========================================================================= */}
      {budgetConfirmTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-champagne/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-serif text-lg font-normal text-primary flex items-center gap-2">
                <Receipt className="w-4 h-4 text-coral" />
                <span>Confirm Budget Entry</span>
              </h3>
              <button
                onClick={() => setBudgetConfirmTheme(null)}
                className="text-muted hover:text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddToBudget} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-page/70 border border-border/70 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted font-mono block">
                  Theme Selected
                </span>
                <span className="font-serif text-sm font-medium text-primary block">
                  {budgetConfirmTheme.title}
                </span>
                <span className="text-muted text-[11px] block">
                  {budgetConfirmTheme.tagline}
                </span>
              </div>

              <div>
                <label className="text-muted font-medium block mb-1">
                  Budget Category
                </label>
                <input
                  type="text"
                  value={confirmBudgetCategory}
                  onChange={(e) => setConfirmBudgetCategory(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary focus:outline-none focus:border-coral"
                  required
                />
              </div>

              <div>
                <label className="text-muted font-medium block mb-1">
                  Proposed Estimated Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={confirmBudgetAmount}
                  onChange={(e) => setConfirmBudgetAmount(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary font-mono focus:outline-none focus:border-coral"
                  required
                />
                <span className="text-[10px] text-muted block mt-1">
                  Reference range:{" "}
                  {formatCostRange(budgetConfirmTheme.estimatedCostRange, currency)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                This will create a new <strong>ESTIMATED</strong> item in your
                Itemized Budget Ledger without modifying any signed contracts.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setBudgetConfirmTheme(null)}
                  className="px-4 py-2 rounded-xl text-muted hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-coral hover:bg-coral-hover text-white font-medium shadow-subtle transition"
                >
                  {isSaving ? "Adding..." : "Confirm & Add to Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: CONFIRMATION MODAL — ADD TO PLAN & CHECKLIST
         ========================================================================= */}
      {taskConfirmTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-champagne/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-serif text-lg font-normal text-primary flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-champagne" />
                <span>Confirm Checklist Task</span>
              </h3>
              <button
                onClick={() => setTaskConfirmTheme(null)}
                className="text-muted hover:text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddToTask} className="space-y-4 text-xs">
              <div>
                <label className="text-muted font-medium block mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={confirmTaskTitle}
                  onChange={(e) => setConfirmTaskTitle(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary focus:outline-none focus:border-coral"
                  required
                />
              </div>

              <div>
                <label className="text-muted font-medium block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={confirmTaskCategory}
                  onChange={(e) => setConfirmTaskCategory(e.target.value)}
                  className="w-full bg-page border border-border rounded-xl px-3.5 py-2 text-primary focus:outline-none focus:border-coral"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-page/70 border border-border/70 space-y-1">
                <span className="font-medium text-secondary block">
                  Included Arrangements:
                </span>
                <ul className="text-muted list-disc list-inside space-y-0.5 text-[11px]">
                  {taskConfirmTheme.arrangementsChecklist.slice(0, 3).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setTaskConfirmTheme(null)}
                  className="px-4 py-2 rounded-xl text-muted hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine font-medium shadow-subtle transition"
                >
                  {isSaving ? "Adding..." : "Confirm & Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
