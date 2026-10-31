"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Sliders, Sparkles, AlertTriangle } from "lucide-react";
import { formatCentsToCurrency, toCents } from "@/lib/domain/money";
import {
  calculateGuestCountImpact,
  calculateBudgetChangeImpact,
} from "@/lib/domain/change-impact";
import type { BudgetItemEntity } from "@/lib/domain/schemas";

interface PlanSimulationTabProps {
  event: {
    guestCount: number;
    totalBudgetCents: number;
  };
  budgetItems: BudgetItemEntity[];
  currency: string;
  onOpenCopilotWithPrompt: (prompt: string) => void;
}

export function PlanSimulationTab({
  event,
  budgetItems,
  currency,
  onOpenCopilotWithPrompt,
}: PlanSimulationTabProps) {
  // Change Impact Simulation State
  const [simGuestCount, setSimGuestCount] = useState<number>(event.guestCount);
  const [simBudgetDollars, setSimBudgetDollars] = useState<string>(
    (event.totalBudgetCents / 100).toString()
  );

  useEffect(() => {
    setSimGuestCount(event.guestCount);
  }, [event.guestCount]);

  useEffect(() => {
    setSimBudgetDollars((event.totalBudgetCents / 100).toString());
  }, [event.totalBudgetCents]);

  const guestSensitiveItems = useMemo(
    () => budgetItems.filter((i) => i.isGuestSensitive && i.status !== "CANCELLED"),
    [budgetItems]
  );

  // Memoized Change Impact Calculations
  const guestImpact = useMemo(
    () =>
      calculateGuestCountImpact(
        event.guestCount,
        simGuestCount,
        event.totalBudgetCents,
        budgetItems
      ),
    [event.guestCount, simGuestCount, event.totalBudgetCents, budgetItems]
  );

  const budgetImpact = useMemo(
    () =>
      calculateBudgetChangeImpact(
        event.totalBudgetCents,
        toCents(parseFloat(simBudgetDollars) || 0),
        budgetItems
      ),
    [event.totalBudgetCents, simBudgetDollars, budgetItems]
  );

  return (
    <div className="space-y-6 animate-fade-in" role="tabpanel" id="panel-impact" aria-label="Plan Adjustments">
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
              onChange={(e) => setSimGuestCount(parseInt(e.target.value, 10) || 10)}
              className="w-full accent-coral"
              aria-label="Simulate Guest Count"
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
              aria-label="Simulate Total Budget"
            />
          </div>
        </div>

        {/* Contextual AI Copilot Plan Adjustment Explanation Trigger */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() =>
              onOpenCopilotWithPrompt(
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
            {guestSensitiveItems.map((item) => {
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
  );
}

