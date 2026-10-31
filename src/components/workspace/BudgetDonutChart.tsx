"use client";

import React, { useState, memo } from "react";
import { PieChart } from "lucide-react";
import { formatCentsToCurrency } from "@/lib/domain/money";

export interface DonutSliceData {
  name: string;
  color: string;
  pathData: string;
  percentage: number;
}

export interface CategoryAllocationData {
  name: string;
  cents: number;
  percentage: number;
  color: string;
}

interface BudgetDonutChartProps {
  donutSlices: DonutSliceData[];
  categoryAllocations: CategoryAllocationData[];
  totalEstimatedCostCents: number;
  allocationPercent: number;
  currency: string;
  onAddExpense?: () => void;
}

export const BudgetDonutChart = memo(function BudgetDonutChart({
  donutSlices,
  categoryAllocations,
  totalEstimatedCostCents,
  allocationPercent,
  currency,
  onAddExpense,
}: BudgetDonutChartProps) {
  // Local hover state — isolated completely from parent workspace to prevent parent re-renders
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  if (donutSlices.length === 0) {
    return (
      <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-page/50 dark:bg-black/20 border border-border/60">
        <div className="py-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-border mx-auto flex items-center justify-center text-muted">
            <PieChart className="w-8 h-8 opacity-40" />
          </div>
          <span className="text-xs text-muted block">No expenses in budget ledger yet</span>
          {onAddExpense && (
            <button
              onClick={onAddExpense}
              className="px-3.5 py-1.5 rounded-xl bg-aubergine dark:bg-champagne text-white dark:text-aubergine text-xs font-medium"
            >
              + Add First Expense
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeCategory = hoveredSlice
    ? categoryAllocations.find((c) => c.name === hoveredSlice)
    : null;

  return (
    <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-page/50 dark:bg-black/20 border border-border/60">
      <div className="flex flex-col items-center w-full space-y-4">
        {/* SVG Donut */}
        <div className="relative w-52 h-52">
          <svg viewBox="0 0 200 200" className="w-full h-full transform transition-transform" aria-label="Budget allocation donut chart" role="img">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4" aria-live="polite">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted">
              {hoveredSlice || "Allocated"}
            </span>
            <span className="font-serif text-lg font-bold text-primary leading-tight mt-0.5">
              {hoveredSlice
                ? formatCentsToCurrency(activeCategory?.cents || 0, currency)
                : formatCentsToCurrency(totalEstimatedCostCents, currency)}
            </span>
            <span className="text-[11px] text-champagne font-medium">
              {hoveredSlice
                ? `${activeCategory?.percentage || 0}% of total`
                : `${allocationPercent}% Allocated`}
            </span>
          </div>
        </div>

        {/* Donut Categorical Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-xs pt-2 border-t border-border/60">
          {categoryAllocations.slice(0, 6).map((cat) => (
            <div
              key={cat.name}
              tabIndex={0}
              onMouseEnter={() => setHoveredSlice(cat.name)}
              onMouseLeave={() => setHoveredSlice(null)}
              onFocus={() => setHoveredSlice(cat.name)}
              onBlur={() => setHoveredSlice(null)}
              className="flex items-center justify-between gap-1 text-[11px] cursor-pointer hover:text-primary focus-visible:text-primary focus-visible:outline-none transition"
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
    </div>
  );
});
