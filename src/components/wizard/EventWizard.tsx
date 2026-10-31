"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Heart,
  Cake,
  Building2,
  CheckCircle2,
  Database,
  RefreshCw,
  Copy,
  Clock,
  Check,
  Shield,
  Utensils,
  Layers,
} from "lucide-react";
import { toCents, formatCentsToCurrency } from "@/lib/domain/money";
import { validateEventDate } from "@/lib/domain/schemas";
import {
  formatIndianDate,
  validateIndianPinCode,
  INDIAN_CELEBRATION_HUBS,
} from "@/lib/domain/i18n";
import type { AiGeneratedPlanResponse } from "@/lib/domain/ai-contracts";

export type WizardArchetype = "WEDDING" | "BIRTHDAY" | "COMMUNITY";

const WEDDING_CEREMONIES = [
  { id: "ENGAGEMENT", label: "Engagement" },
  { id: "MEHENDI", label: "Mehendi" },
  { id: "HALDI", label: "Haldi" },
  { id: "SANGEET", label: "Sangeet" },
  { id: "BARAAT", label: "Baraat" },
  { id: "WEDDING_CEREMONY", label: "Wedding / Pheras" },
  { id: "RECEPTION", label: "Reception" },
];

const DIETARY_OPTIONS = [
  "Pure Vegetarian (Jain Options Available)",
  "Pure Vegetarian",
  "Multi-Cuisine (Veg & Non-Veg)",
  "Custom / Regional Specialties",
];

interface FormData {
  archetype: WizardArchetype;
  title: string;
  eventDate: string;
  timezone: string;
  location: string;
  pinCode: string;
  totalBudgetDollars: string;
  currency: string;
  guestCount: string;
  theme: string;
  priorities: string;
  selectedSubtypes: string[];
  dietary: string;
}

export default function EventWizard({
  initialArchetype,
}: {
  initialArchetype?: WizardArchetype;
} = {}) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Independent Persistence & Generation State
  const [persistenceState, setPersistenceState] = useState<"IDLE" | "UNPROVISIONED" | "SAVED">("IDLE");
  const [unpersistedPlan, setUnpersistedPlan] = useState<AiGeneratedPlanResponse | null>(null);
  const [generationMetadata, setGenerationMetadata] = useState<{ mode: string; notice?: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const initArchetype = initialArchetype || "WEDDING";

  const [formData, setFormData] = useState<FormData>({
    archetype: initArchetype,
    title: "",
    eventDate: "",
    timezone: "Asia/Kolkata",
    location: "",
    pinCode: "",
    totalBudgetDollars:
      initArchetype === "WEDDING"
        ? "1500000"
        : initArchetype === "BIRTHDAY"
        ? "150000"
        : "300000",
    currency: "INR",
    guestCount:
      initArchetype === "WEDDING"
        ? "250"
        : initArchetype === "BIRTHDAY"
        ? "60"
        : "400",
    theme:
      initArchetype === "WEDDING"
        ? "Royal Heritage & Floral Elegance"
        : initArchetype === "BIRTHDAY"
        ? "Bollywood Retro or Pastel Carnival"
        : "Eco-Friendly Cultural Utsav",
    priorities:
      initArchetype === "WEDDING"
        ? "Grand multi-cuisine feast, live chaat counters, and sangeet choreography"
        : initArchetype === "BIRTHDAY"
        ? "Engaging emcee host, designer cake, and personalized return gifts"
        : "High-power sound system, zero-waste sanitation, and police NOC verification",
    selectedSubtypes:
      initArchetype === "WEDDING"
        ? ["MEHENDI", "SANGEET", "WEDDING_CEREMONY", "RECEPTION"]
        : [],
    dietary: "Pure Vegetarian (Jain Options Available)",
  });

  const handleArchetypeChange = (archetype: WizardArchetype) => {
    let budget = "1500000";
    let guests = "250";
    let theme = "Royal Heritage & Floral Elegance";
    let priorities = "Grand multi-cuisine feast, live chaat counters, and sangeet choreography";
    let subtypes: string[] = [];

    if (archetype === "BIRTHDAY") {
      budget = "150000";
      guests = "60";
      theme = "Bollywood Retro or Pastel Carnival";
      priorities = "Engaging emcee host, designer cake, and personalized return gifts";
      subtypes = ["THEMED_PARTY"];
    } else if (archetype === "COMMUNITY") {
      budget = "300000";
      guests = "400";
      theme = "Eco-Friendly Cultural Utsav";
      priorities = "High-power sound system, zero-waste sanitation, and police NOC verification";
      subtypes = ["CULTURAL_FESTIVAL"];
    } else {
      subtypes = ["MEHENDI", "SANGEET", "WEDDING_CEREMONY", "RECEPTION"];
    }

    setFormData((prev) => ({
      ...prev,
      archetype,
      totalBudgetDollars: budget,
      guestCount: guests,
      theme,
      priorities,
      selectedSubtypes: subtypes,
    }));
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleSubtype = (subtypeId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedSubtypes.includes(subtypeId);
      const next = exists
        ? prev.selectedSubtypes.filter((s) => s !== subtypeId)
        : [...prev.selectedSubtypes, subtypeId];
      return { ...prev, selectedSubtypes: next };
    });
  };

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.archetype) {
        errors.archetype = "Please select an event archetype.";
      }
    }

    if (currentStep === 2) {
      if (!formData.title.trim()) {
        errors.title = "Event title is required.";
      } else if (formData.title.trim().length > 120) {
        errors.title = "Title cannot exceed 120 characters.";
      }

      if (!formData.eventDate) {
        errors.eventDate = "Event date is required.";
      } else {
        const dateCheck = validateEventDate(formData.eventDate);
        if (!dateCheck.isValid) {
          errors.eventDate = dateCheck.error || "Invalid date.";
        }
      }

      if (!formData.location.trim()) {
        errors.location = "City or venue location is required.";
      }

      if (formData.pinCode.trim()) {
        const pinCheck = validateIndianPinCode(formData.pinCode.trim());
        if (!pinCheck.isValid) {
          errors.pinCode = pinCheck.error || "Invalid 6-digit Indian PIN code.";
        }
      }
    }

    if (currentStep === 3) {
      const budgetNum = Number.parseFloat(formData.totalBudgetDollars);
      if (Number.isNaN(budgetNum) || budgetNum < 0) {
        errors.totalBudgetDollars = "Budget must be a positive number.";
      }

      const guestNum = Number.parseInt(formData.guestCount, 10);
      if (Number.isNaN(guestNum) || guestNum < 0) {
        errors.guestCount = "Guest count must be a non-negative integer.";
      } else if (guestNum > 100000) {
        errors.guestCount = "Guest count exceeds maximum allowed limit (100,000).";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const budgetMinorUnits = toCents(formData.totalBudgetDollars);
      const guestCount = Number.parseInt(formData.guestCount, 10);

      const payload = {
        title: formData.title.trim(),
        archetype: formData.archetype,
        eventDate: formData.eventDate,
        timezone: formData.timezone,
        location: formData.location.trim(),
        totalBudgetCents: budgetMinorUnits,
        currency: formData.currency,
        guestCount,
        preferences: {
          theme: formData.theme.trim(),
          priorities: formData.priorities.trim(),
          subtypes: formData.selectedSubtypes,
          dietary: formData.dietary,
          pinCode: formData.pinCode.trim(),
        },
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 201 && data.eventId) {
        setPersistenceState("SAVED");
        router.push(`/events/${data.eventId}`);
        return;
      }

      // Explicit representation of Generation Success + Persistence Failure
      if (res.status === 503 && data.error === "DATABASE_UNCONFIGURED") {
        setPersistenceState("UNPROVISIONED");
        setUnpersistedPlan(data.planPreview || null);
        setGenerationMetadata({
          mode: data.mode || "TEMPLATE_GENERATED",
          notice: data.notice,
        });
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.message || "Failed to generate event plan.");
        if (data.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.fieldErrors)) {
            if (Array.isArray(v) && v[0]) mapped[k] = v[0];
          }
          setFieldErrors(mapped);
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPlanJson = () => {
    if (!unpersistedPlan) return;
    navigator.clipboard.writeText(JSON.stringify(unpersistedPlan, null, 2));
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopiedJson(true);
    copyTimerRef.current = setTimeout(() => {
      setCopiedJson(false);
      copyTimerRef.current = null;
    }, 2000);
  };

  // ==============================================================================
  // VIEW: GENERATION SUCCESS BUT PERSISTENCE UNPROVISIONED
  // ==============================================================================
  if (persistenceState === "UNPROVISIONED" && unpersistedPlan) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-surface border border-border rounded-3xl p-6 sm:p-10 shadow-soft backdrop-blur-xl space-y-6">
        <div className="border-b border-border pb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            PERSISTENCE BLOCKER AUDIT STATE
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
            Plan Generated — Persistence Pending
          </h2>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Your event plan was mathematically derived using the India-first deterministic planning engine. However, because no active PostgreSQL <code className="text-amber-700 dark:text-amber-300 bg-page px-1 py-0.5 rounded border border-border">DATABASE_URL</code> is configured, the plan cannot be saved to durable storage.
          </p>
        </div>

        {/* Independent Status Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-page p-3.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted uppercase font-semibold block mb-1">
              Generation Status
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SUCCESSFUL
            </span>
          </div>

          <div className="bg-page p-3.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted uppercase font-semibold block mb-1">
              Plan Origin
            </span>
            <span className="text-xs font-bold text-coral">
              {generationMetadata?.mode === "AI_GENERATED"
                ? "Live Gemini AI"
                : "India Benchmark Template"}
            </span>
          </div>

          <div className="bg-page p-3.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted uppercase font-semibold block mb-1">
              Currency &amp; Units
            </span>
            <span className="text-xs font-bold text-primary">
              {formData.currency} (Integer Minor Units)
            </span>
          </div>

          <div className="bg-page p-3.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted uppercase font-semibold block mb-1">
              Durable Storage
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Database className="w-3.5 h-3.5" />
              UNSAVED
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <button
            type="button"
            onClick={() => setPersistenceState("IDLE")}
            className="px-4 py-2.5 rounded-xl border border-border text-secondary text-xs font-semibold hover:bg-surface-elevated transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Edit Parameters
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyPlanJson}
              className="px-4 py-2.5 rounded-xl bg-champagne/15 hover:bg-champagne/25 text-secondary border border-champagne/30 text-xs font-semibold transition flex items-center gap-2"
            >
              {copiedJson ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Copied Plan JSON!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Plan JSON
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-semibold transition flex items-center gap-2 shadow-coral disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Retry Saving
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Plan Preview Drawer */}
        <div className="border-t border-border pt-6 space-y-4">
          <h3 className="font-serif font-bold text-primary text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-coral" />
            Generated Plan Preview ({formData.title || "Untitled"})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget Ledger Preview */}
            <div className="bg-page p-4 rounded-2xl border border-border space-y-2">
              <span className="text-xs font-bold text-primary block mb-2 flex items-center justify-between">
                <span>Budget Items ({unpersistedPlan.budgetItems.length})</span>
                <span className="text-coral">
                  {formatCentsToCurrency(toCents(formData.totalBudgetDollars), formData.currency)} Total
                </span>
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {unpersistedPlan.budgetItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface border border-border text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold text-primary block">{item.description}</span>
                      <span className="text-[10px] text-muted">{item.category}</span>
                    </div>
                    <span className="font-bold text-primary text-xs shrink-0">
                      {formatCentsToCurrency(item.estimatedCostCents, formData.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones Preview */}
            <div className="bg-page p-4 rounded-2xl border border-border space-y-2">
              <span className="text-xs font-bold text-primary block mb-2 flex items-center justify-between">
                <span>Timeline Milestones ({unpersistedPlan.milestones.length})</span>
                <span className="text-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatIndianDate(formData.eventDate)}
                </span>
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {unpersistedPlan.milestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface border border-border text-xs flex justify-between items-start"
                  >
                    <div>
                      <span className="font-semibold text-primary block">{m.title}</span>
                      <p className="text-[11px] text-muted mt-0.5">{m.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted shrink-0 ml-2">
                      {formatIndianDate(m.dueAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================================
  // VIEW: 4-STEP WIZARD FORM
  // ==============================================================================
  return (
    <div className="w-full max-w-3xl mx-auto bg-surface border border-border rounded-3xl p-6 sm:p-10 shadow-soft backdrop-blur-xl transition-colors">
      {/* Step Indicator Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-muted mb-3">
          <span className="text-coral">STEP {step} OF 4</span>
          <span className="text-primary font-serif text-sm">
            {step === 1 && "Event Type & Ceremonies"}
            {step === 2 && "Location & Date"}
            {step === 3 && "Budget & Guest Scale"}
            {step === 4 && "Themes & Preferences"}
          </span>
        </div>
        <div className="w-full bg-page border border-border h-2 rounded-full overflow-hidden">
          <div
            className="bg-coral h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold">Action Required</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1: ARCHETYPE & CEREMONIES */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                What celebration are we planning?
              </h2>
              <p className="text-muted text-sm mt-1">
                Choose the primary celebration archetype. Workflows, vendor checklists, and budget envelopes are tailored for India-first planning.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* WEDDING */}
              <button
                type="button"
                onClick={() => handleArchetypeChange("WEDDING")}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  formData.archetype === "WEDDING"
                    ? "bg-rose-500/10 border-coral ring-2 ring-coral/30"
                    : "bg-page border-border hover:border-border-strong"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-coral flex items-center justify-center mb-4">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-primary text-base">Wedding</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Multi-ceremony path (Sangeet, Haldi, Mehendi, Pheras), mandap decor, grand catering &amp; photography.
                </p>
              </button>

              {/* BIRTHDAY */}
              <button
                type="button"
                onClick={() => handleArchetypeChange("BIRTHDAY")}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  formData.archetype === "BIRTHDAY"
                    ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30"
                    : "bg-page border-border hover:border-border-strong"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Cake className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-primary text-base">Birthday</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Banquets, themed balloon styling, custom designer cake, emcee host, live snacks &amp; return gifts.
                </p>
              </button>

              {/* COMMUNITY */}
              <button
                type="button"
                onClick={() => handleArchetypeChange("COMMUNITY")}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  formData.archetype === "COMMUNITY"
                    ? "bg-plum/10 dark:bg-plum/30 border-plum dark:border-champagne ring-2 ring-plum/20 dark:ring-champagne/30"
                    : "bg-page border-border hover:border-border-strong"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-plum/15 text-plum dark:text-champagne flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-primary text-base">Community Event</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Cultural fests, utsavs, municipal ground permits, sound permissions, volunteer teams &amp; zero-waste cleanup.
                </p>
              </button>
            </div>

            {/* Optional Sub-ceremonies for Weddings */}
            {formData.archetype === "WEDDING" && (
              <div className="p-5 rounded-2xl bg-page border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-coral" />
                  <span className="font-serif font-bold text-primary text-sm">
                    Select Planned Ceremonies &amp; Festivities (Optional)
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Choose only the functions relevant to your traditions. Every choice is optional.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {WEDDING_CEREMONIES.map((c) => {
                    const isSelected = formData.selectedSubtypes.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleSubtype(c.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                          isSelected
                            ? "bg-coral text-white border-coral shadow-sm"
                            : "bg-surface text-secondary border-border hover:border-coral/50"
                        }`}
                      >
                        {isSelected ? `✓ ${c.label}` : `+ ${c.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: LOCATION & DATE */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl font-bold text-primary tracking-tight">
                Location &amp; Event Date
              </h2>
              <p className="text-muted text-sm mt-1">
                Provide venue or city details to calibrate milestone lead times and regional planning norms.
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-xs font-semibold text-secondary mb-1.5">
                Event Title *
              </label>
              <input
                id="title"
                type="text"
                placeholder={
                  formData.archetype === "WEDDING"
                    ? "e.g. Rohan & Ananya's Royal Palace Wedding"
                    : formData.archetype === "BIRTHDAY"
                    ? "e.g. Aarav's 5th Superhero Birthday Bash"
                    : "e.g. Bangalore Tech & Cultural Mela 2026"
                }
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-page border text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm ${
                  fieldErrors.title ? "border-red-500" : "border-border"
                }`}
              />
              {fieldErrors.title && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventDate" className="block text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-coral" />
                  Target Event Date *
                </label>
                <input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => updateField("eventDate", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-page border text-primary focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm ${
                    fieldErrors.eventDate ? "border-red-500" : "border-border"
                  }`}
                />
                {fieldErrors.eventDate && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.eventDate}</p>
                )}
                {formData.eventDate && (
                  <span className="text-[11px] text-muted mt-1 block">
                    Formatted: {formatIndianDate(formData.eventDate)}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="location" className="block text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-coral" />
                  City, Venue, or Setting *
                </label>
                <input
                  id="location"
                  type="text"
                  placeholder="e.g. Palace Grounds, Bengaluru or Jaipur, Rajasthan"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  list="popular-indian-cities"
                  className={`w-full px-4 py-3 rounded-xl bg-page border text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm ${
                    fieldErrors.location ? "border-red-500" : "border-border"
                  }`}
                />
                <datalist id="popular-indian-cities">
                  {INDIAN_CELEBRATION_HUBS.map((hub, idx) => (
                    <option key={idx} value={hub.label} />
                  ))}
                </datalist>
                {fieldErrors.location && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.location}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pinCode" className="block text-xs font-semibold text-secondary mb-1.5">
                  Venue PIN Code (Optional)
                </label>
                <input
                  id="pinCode"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 560001 or 302001"
                  value={formData.pinCode}
                  onChange={(e) => updateField("pinCode", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-page border text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm ${
                    fieldErrors.pinCode ? "border-red-500" : "border-border"
                  }`}
                />
                {fieldErrors.pinCode && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.pinCode}</p>
                )}
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-coral" />
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-page border border-border text-primary text-sm focus:outline-none focus:border-coral"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST — UTC+05:30)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FINANCIAL & GUEST SCALE */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl font-bold text-primary tracking-tight">
                Budget &amp; Guest Scale
              </h2>
              <p className="text-muted text-sm mt-1">
                All numbers are tracked in integer paise ({formData.currency}) to ensure zero financial drift and authentic Indian digit grouping.
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-page border border-border rounded-xl">
              <span className="text-xs font-semibold text-secondary">Currency:</span>
              <button
                type="button"
                onClick={() => updateField("currency", "INR")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  formData.currency === "INR"
                    ? "bg-coral text-white shadow-sm"
                    : "bg-surface text-secondary hover:text-primary"
                }`}
              >
                INR (₹) — India
              </button>
              <button
                type="button"
                onClick={() => updateField("currency", "USD")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  formData.currency === "USD"
                    ? "bg-coral text-white shadow-sm"
                    : "bg-surface text-secondary hover:text-primary"
                }`}
              >
                USD ($) — International
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="totalBudget" className="block text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-coral" />
                  Total Event Budget ({formData.currency === "INR" ? "₹ Rupees" : "$ Dollars"}) *
                </label>
                <input
                  id="totalBudget"
                  type="number"
                  min="0"
                  step="500"
                  placeholder={formData.currency === "INR" ? "e.g. 1500000" : "e.g. 25000"}
                  value={formData.totalBudgetDollars}
                  onChange={(e) => updateField("totalBudgetDollars", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-page border text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm ${
                    fieldErrors.totalBudgetDollars ? "border-red-500" : "border-border"
                  }`}
                />
                {fieldErrors.totalBudgetDollars && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.totalBudgetDollars}</p>
                )}
                {formData.totalBudgetDollars && !isNaN(Number(formData.totalBudgetDollars)) && (
                  <span className="text-[11px] font-semibold text-coral mt-1 block">
                    Formatted: {formatCentsToCurrency(toCents(formData.totalBudgetDollars), formData.currency)}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="guestCount" className="block text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-coral" />
                  Expected Guest Count *
                </label>
                <input
                  id="guestCount"
                  type="number"
                  min="0"
                  max="100000"
                  placeholder="e.g. 250"
                  value={formData.guestCount}
                  onChange={(e) => updateField("guestCount", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-page border text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm ${
                    fieldErrors.guestCount ? "border-red-500" : "border-border"
                  }`}
                />
                {fieldErrors.guestCount && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.guestCount}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-page border border-border text-xs text-muted flex items-center justify-between">
              <span>Estimated Budget Per Person:</span>
              <span className="font-semibold text-primary text-sm font-serif">
                {formData.guestCount && Number(formData.guestCount) > 0
                  ? formatCentsToCurrency(
                      Math.round(toCents(formData.totalBudgetDollars || 0) / Number(formData.guestCount)),
                      formData.currency
                    )
                  : formatCentsToCurrency(0, formData.currency)}{" "}
                / guest
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: THEME, DIETARY & GENERATION */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl font-bold text-primary tracking-tight">
                Vibe, Dietary &amp; Plan Generation
              </h2>
              <p className="text-muted text-sm mt-1">
                Customize traditions, cuisine style, and special priorities for your celebration.
              </p>
            </div>

            <div>
              <label htmlFor="dietary" className="block text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-coral" />
                Catering &amp; Dietary Tradition
              </label>
              <select
                id="dietary"
                value={formData.dietary}
                onChange={(e) => updateField("dietary", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-page border border-border text-primary text-sm focus:outline-none focus:border-coral"
              >
                {DIETARY_OPTIONS.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="theme" className="block text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-coral" />
                Theme / Atmosphere
              </label>
              <input
                id="theme"
                type="text"
                placeholder="e.g. Royal Marwar Palace Theme, Bollywood Retro, Eco-Friendly Zero Waste"
                value={formData.theme}
                onChange={(e) => updateField("theme", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-page border border-border text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm"
              />
            </div>

            <div>
              <label htmlFor="priorities" className="block text-xs font-semibold text-secondary mb-1.5">
                Key Priorities &amp; Special Requirements
              </label>
              <textarea
                id="priorities"
                rows={3}
                placeholder="e.g. Live chaat counter is top priority; need wheelchair accessibility; need outstation guest airport shuttles."
                value={formData.priorities}
                onChange={(e) => updateField("priorities", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-page border border-border text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral text-sm"
              />
            </div>

            {/* Summary Review Card */}
            <div className="p-4 rounded-xl bg-page border border-border text-xs space-y-2">
              <div className="flex justify-between text-secondary">
                <span className="text-muted">Celebration:</span>
                <span className="font-semibold text-primary">{formData.archetype} ({formData.title || "Untitled"})</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span className="text-muted">Date &amp; Setting:</span>
                <span className="font-semibold text-primary">
                  {formData.eventDate ? formatIndianDate(formData.eventDate) : "TBD"} — {formData.location || "TBD"}
                </span>
              </div>
              <div className="flex justify-between text-secondary">
                <span className="text-muted">Budget &amp; Scale:</span>
                <span className="font-semibold text-coral">
                  {formatCentsToCurrency(toCents(formData.totalBudgetDollars), formData.currency)} for {formData.guestCount} guests
                </span>
              </div>
              {formData.selectedSubtypes.length > 0 && (
                <div className="flex justify-between text-secondary">
                  <span className="text-muted">Ceremonies:</span>
                  <span className="font-medium text-primary">
                    {formData.selectedSubtypes.join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <Shield className="w-3.5 h-3.5 text-champagne" />
              <span>Transparent AI benchmarks • Sound &amp; municipal norms marked for verification</span>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-8 border-t border-border mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-border text-secondary text-xs font-semibold hover:bg-surface-elevated transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-semibold transition flex items-center gap-2 shadow-coral"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-3 rounded-xl bg-coral hover:bg-coral-hover text-white text-sm font-semibold transition flex items-center gap-2 shadow-coral disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Event Plan
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
