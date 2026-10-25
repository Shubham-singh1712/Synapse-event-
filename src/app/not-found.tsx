import React from "react";
import Link from "next/link";
import { Home, LayoutDashboard, Compass, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

export const metadata = {
  title: "404 — Celebration Not Found | SynapseEvent",
  description: "The celebration page or workspace you are looking for does not exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-page text-primary flex flex-col justify-between p-4 sm:p-6 transition-colors">
      {/* Top Bar with brand mark & theme toggle */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="SynapseEvent Home">
          <div className="w-8 h-8 rounded-xl bg-coral flex items-center justify-center text-white font-serif font-black shadow-sm group-hover:scale-105 transition text-base">
            S
          </div>
          <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-primary">
            Synapse<span className="text-coral">Event</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main 404 Visual Content */}
      <main className="my-auto max-w-lg mx-auto w-full text-center py-8 px-4 space-y-6">
        {/* Decorative Badge & Monogram */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-champagne/15 border border-champagne/30 text-xs font-semibold text-secondary tracking-wide">
            <Compass className="w-3.5 h-3.5 text-coral animate-spin-slow" />
            <span>Navigation Advisory</span>
          </div>

          <div className="relative inline-block">
            <div className="text-7xl sm:text-8xl font-serif font-black text-coral/20 select-none tracking-tighter">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-coral shadow-card">
                <Sparkles className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Friendly Editorial Headline */}
        <div className="space-y-2">
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-primary">
            This celebration took a wrong turn.
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
            The page, celebration plan, or workspace you are looking for does not exist, has been archived, or the link may be outdated.
          </p>
        </div>

        {/* Primary & Secondary Action CTAs */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            id="404-return-home-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs sm:text-sm font-semibold transition-all shadow-coral transform hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>

          <Link
            href="/dashboard"
            id="404-open-dashboard-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface hover:bg-surface-elevated text-primary border border-border text-xs sm:text-sm font-semibold transition-all hover:border-coral/40"
          >
            <LayoutDashboard className="w-4 h-4 text-coral" />
            <span>Open Dashboard</span>
          </Link>
        </div>

        {/* Helpful Alternate Pathways */}
        <div className="pt-6 border-t border-border flex items-center justify-center gap-6 text-xs text-muted">
          <Link href="/services" className="hover:text-coral transition-colors">
            Explore Services
          </Link>
          <span>•</span>
          <Link href="/#event-types" className="hover:text-coral transition-colors">
            Event Types
          </Link>
          <span>•</span>
          <Link href="/sign-in" className="hover:text-coral transition-colors">
            Sign In
          </Link>
        </div>
      </main>

      {/* Discreet Footer */}
      <footer className="text-center text-muted text-xs py-3 border-t border-border mt-auto">
        SynapseEvent • Deterministic Celebration Architecture
      </footer>
    </div>
  );
}
