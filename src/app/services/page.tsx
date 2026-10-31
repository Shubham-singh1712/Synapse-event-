import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUp, ListOrdered } from "lucide-react";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import PublicFooter from "@/components/navigation/PublicFooter";

export const metadata: Metadata = {
  title: "Services — SynapseEvent Atelier",
  description:
    "Explore the range of event planning services, features, and tools offered by SynapseEvent, including AI assistance, budgeting, vendor management, and compliance guidance.",
};

export default function ServicesPage() {
  const user = null;

  const sections = [
    { id: "overview", num: "01", title: "Overview & Value Proposition" },
    { id: "budgeting", num: "02", title: "Intelligent Budgeting" },
    { id: "timeline", num: "03", title: "Dynamic Timeline Planning" },
    { id: "ai", num: "04", title: "AI‑Powered Copilot" },
    { id: "vendors", num: "05", title: "Vendor Management" },
    { id: "compliance", num: "06", title: "Regulatory Compliance" },
  ];

  return (
    <div id="top" className="min-h-screen bg-page text-primary flex flex-col transition-colors duration-200">
      <PublicNavbar user={user} />

      <main className="flex-1 pb-16 sm:pb-24">
        {/* Header Hero – seamless background */}
        <header className="pt-10 sm:pt-14 pb-6 sm:pb-8 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/15 border border-champagne/30 text-xs font-semibold text-secondary">
              <svg className="w-3.5 h-3.5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" /></svg>
              <span>Our Offerings</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-black text-primary tracking-tight">
              Services &amp; Features
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto leading-relaxed">
              Discover the premium suite of tools that power your celebration planning experience.
            </p>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
          {/* Table of Contents */}
          <nav className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-coral" />
                <h2 className="font-serif font-bold text-primary text-sm sm:text-base">Contents</h2>
              </div>
              <span className="text-xs text-muted">{sections.length} sections</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-secondary hover:text-coral hover:bg-champagne/15 transition-colors group"
                >
                  <span className="text-[11px] font-mono text-muted group-hover:text-coral shrink-0 font-semibold">
                    {sec.num}.
                  </span>
                  <span className="truncate group-hover:underline underline-offset-4">{sec.title}</span>
                </a>
              ))}
            </div>
          </nav>

          {/* Sections */}
          <div className="space-y-10 text-xs sm:text-sm text-secondary leading-relaxed">
            {/* Overview */}
            <section id="overview" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">1. Overview &amp; Value Proposition</h2>
              <p className="text-muted leading-relaxed">
                SynapseEvent combines deterministic budgeting, AI‑driven suggestions, and compliance safeguards to deliver a frictionless planning workflow.
              </p>
            </section>

            {/* Intelligent Budgeting */}
            <section id="budgeting" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">2. Intelligent Budgeting</h2>
              <p className="text-muted leading-relaxed">
                Our integer‑arithmetic money domain guarantees precise calculations without floating‑point drift, while real‑time simulations let you explore &quot;what‑if&quot; scenarios safely.
              </p>
            </section>

            {/* Dynamic Timeline Planning */}
            <section id="timeline" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">3. Dynamic Timeline Planning</h2>
              <p className="text-muted leading-relaxed">
                Generate milestone roadmaps, set reminders, and receive compliance alerts (e.g., 10 PM sound limits) directly within the workspace.
              </p>
            </section>

            {/* AI‑Powered Copilot */}
            <section id="ai" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">4. AI‑Powered Copilot</h2>
              <p className="text-muted leading-relaxed">
                Leverage Google Gemini to generate themed ideas, vendor recommendations, and culturally aware suggestions while staying within budget constraints.
              </p>
            </section>

            {/* Vendor Management */}
            <section id="vendors" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">5. Vendor Management</h2>
              <p className="text-muted leading-relaxed">
                Record vendor quotes, track deposits, and compare offerings in a structured workspace without the platform acting as an intermediary.
              </p>
            </section>

            {/* Regulatory Compliance */}
            <section id="compliance" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">6. Regulatory Compliance</h2>
              <p className="text-muted leading-relaxed">
                Integrated guidance for municipal sound limits, fire safety clearances, and other legal requirements, with links to official resources.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Navigation / Back to Top */}
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-semibold text-secondary hover:text-primary transition">
            &larr; Return to Home
          </Link>
          <a href="#top" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-coral transition">
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Back to top</span>
          </a>
        </div>
        <Link
          href={user ? "/dashboard" : "/sign-up"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-coral hover:bg-coral-hover text-white shadow-coral transition"
        >
          <span>{user ? "Open Dashboard" : "Start Planning"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <PublicFooter />
    </div>
  );
}
