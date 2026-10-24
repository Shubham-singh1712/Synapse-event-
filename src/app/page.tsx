import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Shield,
  Calculator,
  Clock,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  Heart,
  PartyPopper,
  Flag,
  ChevronRight,
  Sliders,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth-service";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import { CelebrationHeroShowcase } from "@/components/landing/CelebrationHeroShowcase";

export default async function PublicLandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col transition-colors duration-200">
      {/* 1. Header Navigation */}
      <PublicNavbar user={user} />

      <main className="flex-1">
        {/* 2. Living Celebration Showcase Hero */}
        <CelebrationHeroShowcase user={user} />

        {/* 2b. Core Celebration Benefits Highlight */}
        <section id="benefits" className="py-12 sm:py-16 bg-surface border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Benefit 1 */}
              <div className="bg-page/70 dark:bg-page/40 rounded-2xl p-6 sm:p-7 border border-border/80 hover:border-coral/40 transition-all hover:shadow-subtle flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center mb-4">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-primary mb-2">
                    A budget that stays clear.
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Set envelope targets for catering, venues, and decor. Track deposits and balance payments so you never encounter surprise costs.
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="bg-page/70 dark:bg-page/40 rounded-2xl p-6 sm:p-7 border border-border/80 hover:border-coral/40 transition-all hover:shadow-subtle flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-champagne/30 text-champagne-dark dark:text-champagne flex items-center justify-center mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-primary mb-2">
                    A plan that keeps everyone on track.
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    A unified schedule combining major milestones and day-of checklist tasks. Keep family, hosts, and vendors aligned effortlessly.
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="bg-page/70 dark:bg-page/40 rounded-2xl p-6 sm:p-7 border border-border/80 hover:border-coral/40 transition-all hover:shadow-subtle flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-plum/15 text-plum-light dark:text-plum flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-primary mb-2">
                    Ideas made for your celebration.
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Discover visual moodboards and get tailored copilot recommendations grounded in your actual event dates, guest count, and traditions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Event Types Showcase (Weddings, Birthdays, Community Gatherings) */}
        <section id="event-types" className="py-20 bg-surface border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto space-y-3 mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-coral">
                Tailored Event Archetypes
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif font-black text-primary">
                Designed for genuine celebration complexity
              </h2>
              <p className="text-sm text-muted">
                Each event type employs specialized domain logic, customized budget
                breakdowns, and relative lead-time schedules.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* WEDDING */}
              <div className="bg-page border border-border rounded-3xl p-8 flex flex-col justify-between hover:shadow-card hover:border-coral/40 transition-all space-y-6">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 text-coral flex items-center justify-center mb-5">
                    <Heart className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-coral block mb-1">
                    Formal Celebration
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-primary mb-3">
                    Weddings
                  </h3>
                  <p className="text-xs text-muted leading-relaxed mb-6">
                    Multi-ceremony orchestration across Sangeet, Mehendi, Pheras, and Reception.
                    Prioritizes banquet advances, per-plate catering, mandap decor, cinematography, and priest coordination.
                  </p>
                  <ul className="space-y-2.5 text-xs text-secondary">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Guest-sensitive catering &amp; mithai ratios
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Multi-ceremony relative milestone ladder
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Vendor contracts &amp; advance deposit tracking
                    </li>
                  </ul>
                </div>

                <Link
                  href={
                    user
                      ? "/events/new?type=WEDDING"
                      : `/sign-in?returnUrl=${encodeURIComponent("/events/new?type=WEDDING")}&type=WEDDING`
                  }
                  id="plan-wedding-action"
                  className="inline-flex items-center justify-between w-full text-xs font-bold text-coral hover:text-coral-hover pt-4 border-t border-border group focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-b-xl transition-colors"
                  aria-label="Plan a Wedding celebration"
                >
                  <span className="group-hover:underline underline-offset-4">Plan a Wedding</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* BIRTHDAY */}
              <div className="bg-page border border-border rounded-3xl p-8 flex flex-col justify-between hover:shadow-card hover:border-coral/40 transition-all space-y-6">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-champagne/20 border border-champagne/40 text-champagne-dark dark:text-champagne flex items-center justify-center mb-5">
                    <PartyPopper className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-champagne-dark dark:text-champagne block mb-1">
                    Milestone Party
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-primary mb-3">
                    Birthdays
                  </h3>
                  <p className="text-xs text-muted leading-relaxed mb-6">
                    Lively milestone gatherings emphasizing party venues, custom bakeries,
                    vibrant themes, DJ entertainment, and memorable return gifts.
                  </p>
                  <ul className="space-y-2.5 text-xs text-secondary">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Curated theme &amp; activity suggestions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      4-week fast-track timeline
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Bakery, DJ, return gifts &amp; decor checklist
                    </li>
                  </ul>
                </div>

                <Link
                  href={
                    user
                      ? "/events/new?type=BIRTHDAY"
                      : `/sign-in?returnUrl=${encodeURIComponent("/events/new?type=BIRTHDAY")}&type=BIRTHDAY`
                  }
                  id="plan-birthday-action"
                  className="inline-flex items-center justify-between w-full text-xs font-bold text-coral hover:text-coral-hover pt-4 border-t border-border group focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-b-xl transition-colors"
                  aria-label="Plan a Birthday celebration"
                >
                  <span className="group-hover:underline underline-offset-4">Plan a Birthday</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* COMMUNITY EVENT */}
              <div className="bg-page border border-border rounded-3xl p-8 flex flex-col justify-between hover:shadow-card hover:border-coral/40 transition-all space-y-6">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-plum/10 dark:bg-plum/30 border border-plum/20 text-plum dark:text-secondary flex items-center justify-center mb-5">
                    <Flag className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-plum dark:text-secondary block mb-1">
                    Public Gathering
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-primary mb-3">
                    Community Events
                  </h3>
                  <p className="text-xs text-muted leading-relaxed mb-6">
                    Public festivals, college fests, and cultural utsavs centering on police NOCs,
                    loudspeaker 10 PM sound compliance, stage setups, volunteer rosters, and sanitation.
                  </p>
                  <ul className="space-y-2.5 text-xs text-secondary">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Police NOC &amp; 10 PM sound verification
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Volunteer shift &amp; logistics schedules
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                      Ground capacity thresholds &amp; security buffer
                    </li>
                  </ul>
                </div>

                <Link
                  href={
                    user
                      ? "/events/new?type=COMMUNITY"
                      : `/sign-in?returnUrl=${encodeURIComponent("/events/new?type=COMMUNITY")}&type=COMMUNITY`
                  }
                  id="plan-community-action"
                  className="inline-flex items-center justify-between w-full text-xs font-bold text-coral hover:text-coral-hover pt-4 border-t border-border group focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-b-xl transition-colors"
                  aria-label="Plan a Community Event"
                >
                  <span className="group-hover:underline underline-offset-4">Plan a Community Event</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Core Capabilities */}
        {/* 4. Thoughtfully Designed Features */}
        <section id="capabilities" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-coral">
              Thoughtfully Designed Features
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-primary">
              Everything you need to celebrate with peace of mind
            </h2>
            <p className="text-sm text-muted">
              Built to remove stress, clarify finances, and give your family room to enjoy the celebration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-surface border border-border rounded-3xl p-7 space-y-3 shadow-subtle hover:border-plum/40 transition">
              <div className="w-10 h-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-primary">A Budget That Stays Clear</h3>
              <p className="text-xs text-muted leading-relaxed">
                Exact financial tracking down to the rupee. Easily distinguish quotes, committed bookings, and reserve buffers with zero guesswork.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-7 space-y-3 shadow-subtle hover:border-plum/40 transition">
              <div className="w-10 h-10 rounded-xl bg-champagne/20 text-champagne-dark dark:text-champagne flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-primary">A Plan That Keeps Everyone on Track</h3>
              <p className="text-xs text-muted leading-relaxed">
                Smart timeline countdowns and checklist milestones tailored to your celebration date, so you always know what to tackle next.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-7 space-y-3 shadow-subtle hover:border-plum/40 transition">
              <div className="w-10 h-10 rounded-xl bg-plum/10 text-plum dark:text-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-primary">Ideas Made for Your Celebration</h3>
              <p className="text-xs text-muted leading-relaxed">
                Thoughtful visual palettes, regional culinary highlights, and curated activity suggestions tailored to your culture and style.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-7 space-y-3 shadow-subtle hover:border-plum/40 transition">
              <div className="w-10 h-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-primary">Adaptive When Plans Change</h3>
              <p className="text-xs text-muted leading-relaxed">
                Need to invite 10 more guests or adjust your total budget? SynapseEvent recalculates cost changes and updates your plan seamlessly.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-7 space-y-3 shadow-subtle hover:border-plum/40 transition">
              <div className="w-10 h-10 rounded-xl bg-champagne/20 text-champagne-dark dark:text-champagne flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-primary">Vendor Coordination Made Simple</h3>
              <p className="text-xs text-muted leading-relaxed">
                Keep vendor quotations, questions to ask, deposit statuses, and booked partners organized together in one stress-free view.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-7 space-y-3 shadow-subtle hover:border-plum/40 transition">
              <div className="w-10 h-10 rounded-xl bg-plum/10 text-plum dark:text-secondary flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-primary">Private &amp; Secure by Design</h3>
              <p className="text-xs text-muted leading-relaxed">
                Your celebration plans, guest details, and financial arrangements remain completely isolated, secure, and private to your account.
              </p>
            </div>
          </div>
        </section>

        {/* 5. How It Works */}
        <section id="how-it-works" className="py-20 bg-surface border-y border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-coral">
                Workflow
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif font-black text-primary">
                How SynapseEvent powers your celebration
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-coral/10 border border-coral/30 text-coral font-serif font-black text-xl mx-auto flex items-center justify-center">
                  1
                </div>
                <h3 className="text-lg font-bold text-primary">Set Parameters</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Provide your target date, guest count, financial budget envelope,
                  setting, and desired themes or hard constraints.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-champagne/20 border border-champagne/40 text-champagne-dark dark:text-champagne font-serif font-black text-xl mx-auto flex items-center justify-center">
                  2
                </div>
                <h3 className="text-lg font-bold text-primary">Synthesize Plan</h3>
                <p className="text-xs text-muted leading-relaxed">
                  The GenAI engine generates a structured plan with itemized budget
                  allocations, relative milestones, and vendor tasks.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-plum/10 dark:bg-plum/30 border border-plum/20 text-plum dark:text-secondary font-serif font-black text-xl mx-auto flex items-center justify-center">
                  3
                </div>
                <h3 className="text-lg font-bold text-primary">Coordinate &amp; Adapt</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Manage your interactive workspace, edit items inline, track vendor
                  quotes, and simulate guest count changes in real time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Studio Preview (Explicitly Labelled) */}
        <section id="preview" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-surface border border-border text-secondary">
              <Sparkles className="w-3.5 h-3.5 text-coral" />
              Verified Studio Interface Preview
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-primary">
              The Planning Command Center
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Live application view showing the Heritage Wedding archetype ledger and multi-ceremony relative milestones.
            </p>
          </div>

          {/* Product Mock Preview Card */}
          <div className="bg-surface border border-border rounded-4xl p-6 sm:p-10 shadow-card">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-coral/10 text-coral border border-coral/20">
                    WEDDING
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-champagne/20 text-champagne-dark dark:text-champagne border border-champagne/30">
                    Live AI Synthesis (Gemini)
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-primary">
                  Ananya &amp; Kabir Heritage Wedding
                </h3>
                <div className="flex items-center gap-4 text-xs text-muted mt-1.5">
                  <span>24 Nov 2026</span>
                  <span>•</span>
                  <span>250 Guests</span>
                  <span>•</span>
                  <span>Heritage Haveli &amp; Lawn, Jaipur</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-muted block">Total Budget</span>
                <span className="text-3xl font-black text-coral font-sans tabular-nums">
                  ₹25,00,000
                </span>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
              <div className="bg-page border border-border rounded-2xl p-4">
                <span className="text-xs text-muted block mb-1">Allocated Expenses</span>
                <span className="text-lg font-bold text-primary tabular-nums">₹23,25,000</span>
                <span className="text-[11px] text-muted block mt-0.5">93% of budget</span>
              </div>
              <div className="bg-page border border-border rounded-2xl p-4">
                <span className="text-xs text-muted block mb-1">Reserve Contingency</span>
                <span className="text-lg font-bold text-coral tabular-nums">₹1,75,000</span>
                <span className="text-[11px] text-muted block mt-0.5">7% unallocated safety</span>
              </div>
              <div className="bg-page border border-border rounded-2xl p-4">
                <span className="text-xs text-muted block mb-1">Cost Per Guest</span>
                <span className="text-lg font-bold text-primary tabular-nums">₹9,300</span>
                <span className="text-[11px] text-muted block mt-0.5">Across 250 guests</span>
              </div>
              <div className="bg-page border border-border rounded-2xl p-4">
                <span className="text-xs text-muted block mb-1">Milestones</span>
                <span className="text-lg font-bold text-primary">4 of 8 Ready</span>
                <span className="text-[11px] text-muted block mt-0.5">50% completed</span>
              </div>
            </div>

            {/* Sub-panels preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-page border border-border rounded-2xl p-5 space-y-3">
                <span className="text-xs font-bold text-primary flex items-center justify-between">
                  <span>Budget Ledger Preview</span>
                  <span className="text-[11px] text-muted font-normal">Exact Integer Paise</span>
                </span>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary">Heritage Courtyard &amp; Mandap Lawn</span>
                      <span className="text-[11px] text-muted block">Venue &amp; Setup • Advance Paid</span>
                    </div>
                    <span className="font-bold text-coral tabular-nums">₹7,50,000</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary">Royal Rajasthani &amp; Multi-Cuisine Feast</span>
                      <span className="text-[11px] text-muted block">Catering &amp; Mithai • Per-Plate Estimate</span>
                    </div>
                    <span className="font-bold text-coral tabular-nums">₹8,75,000</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary">Mandap Floral &amp; Ambient Lighting</span>
                      <span className="text-[11px] text-muted block">Decor &amp; Tent House • Vendor Quoted</span>
                    </div>
                    <span className="font-bold text-coral tabular-nums">₹3,50,000</span>
                  </div>
                </div>
              </div>

              <div className="bg-page border border-border rounded-2xl p-5 space-y-3">
                <span className="text-xs font-bold text-primary flex items-center justify-between">
                  <span>Timeline Milestones Preview</span>
                  <span className="text-[11px] text-muted font-normal">Relative Schedules</span>
                </span>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary">Finalize Lawn Booking &amp; Pay Advance</span>
                      <span className="text-[11px] text-muted block">240 days before event</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] bg-coral/10 text-coral font-bold">
                      COMPLETED
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary">Book Sangeet Choreographer &amp; Sound</span>
                      <span className="text-[11px] text-muted block">90 days before event • 10 PM NOC</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] bg-page border border-border text-secondary font-semibold">
                      IN PROGRESS
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-primary">Confirm Mehendi Artists &amp; Floral Jewelry</span>
                      <span className="text-[11px] text-muted block">60 days before event</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] bg-page border border-border text-secondary font-semibold">
                      PENDING
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Trust and Transparency */}
        <section className="py-16 bg-surface border-y border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-page border border-border rounded-3xl p-6 sm:p-8 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-coral shrink-0 mt-0.5" />
              <div className="space-y-2 text-xs text-secondary">
                <h3 className="font-serif font-bold text-primary text-base">
                  Trust, Transparency &amp; Deterministic Integrity
                </h3>
                <p className="leading-relaxed">
                  All financial calculations in SynapseEvent are strictly computed on
                  the server using exact integer paise (INR). Generated budget allocations are
                  realistic archetype benchmarks or AI estimates; they do not represent
                  confirmed vendor bookings until you negotiate quotations.
                </p>
                <p className="text-muted leading-relaxed">
                  Police sound NOCs, 10 PM loudspeaker compliance regulations, and municipal venue
                  guidelines must be verified with local regulatory authorities. You retain 100%
                  control to customize, override, or lock any line item in your plan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Final Call to Action */}
        <section className="py-24 text-center max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-primary tracking-tight">
            Ready to plan without the chaos?
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
            Create your first celebration in less than two minutes. Generate an
            integer-cents budget, connected timeline, and vendor checklist today.
          </p>
          <div className="pt-4">
            <Link
              href={user ? "/dashboard" : "/sign-up"}
              id="footer-final-cta"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl text-sm font-bold bg-coral hover:bg-coral-hover text-white shadow-coral transition-all transform hover:-translate-y-0.5"
            >
              {user ? "Go to Dashboard" : "Start Planning Now"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-coral flex items-center justify-center text-white font-serif font-bold text-xs">
              S
            </div>
            <span className="font-serif font-bold text-primary text-sm">SynapseEvent</span>
            <span>• Intelligent Celebration &amp; Event Planning Atelier</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#event-types" className="hover:text-primary transition-colors">
              Event Types
            </a>
            <a href="#capabilities" className="hover:text-primary transition-colors">
              Capabilities
            </a>
            <Link href="/sign-in" className="hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-primary transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
