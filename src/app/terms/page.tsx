import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, FileText, ArrowRight, ArrowUp, ListOrdered } from "lucide-react";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import PublicFooter from "@/components/navigation/PublicFooter";

export const metadata: Metadata = {
  title: "Terms & Conditions — SynapseEvent Atelier",
  description:
    "Review the terms of service governing your use of SynapseEvent's celebration planning platform, deterministic budget calculations, and AI advisory tools.",
};

export default function TermsPage() {
  const user = null;

  const sections = [
    { id: "acceptance", num: "01", title: "Acceptance of Terms" },
    { id: "platform-nature", num: "02", title: "Platform Purpose & Advisory Nature" },
    { id: "accounts", num: "03", title: "Account Creation & Security" },
    { id: "permitted-use", num: "04", title: "Permitted Use & Prohibited Conduct" },
    { id: "ai-limitations", num: "05", title: "AI-Generated Content & Math Limits" },
    { id: "compliance", num: "06", title: "Venue Rules, Sound & Municipal Compliance" },
    { id: "vendors", num: "07", title: "Third-Party Vendors & Quotations" },
    { id: "user-content", num: "08", title: "User Content & Workspace Data" },
    { id: "intellectual-property", num: "09", title: "Intellectual Property" },
    { id: "availability", num: "10", title: "Service Availability & Changes" },
    { id: "termination", num: "11", title: "Suspension & Account Termination" },
    { id: "liability", num: "12", title: "Disclaimers & Limitation of Liability" },
    { id: "owner-decisions", num: "13", title: "Contact & Owner Determinations" },
  ];

  return (
    <div id="top" className="min-h-screen bg-page text-primary flex flex-col transition-colors duration-200">
      <PublicNavbar user={user} />

      <main className="flex-1 pb-16 sm:pb-24">
        {/* Seamless Header Hero — One Continuous Background, No Harsh Boundary */}
        <header className="pt-10 sm:pt-14 pb-6 sm:pb-8 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/15 border border-champagne/30 text-xs font-semibold text-secondary">
              <FileText className="w-3.5 h-3.5 text-coral" />
              <span>Legal &amp; Operational Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-black text-primary tracking-tight">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto leading-relaxed">
              Last updated: October 25, 2026 • Please read these terms carefully before creating a celebration plan or using the SynapseEvent platform.
            </p>
          </div>
        </header>

        {/* Centered Editorial Content Body */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
          {/* Highlight Callout — Distinct card surface with subtle border and soft shadow */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex items-start gap-4 shadow-subtle">
            <AlertCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs sm:text-sm">
              <h3 className="font-serif font-bold text-primary text-sm sm:text-base">
                Core Platform Summary
              </h3>
              <p className="text-muted leading-relaxed">
                SynapseEvent provides software tools for computational budget tracking, relative celebration timelines, 
                and AI-assisted planning recommendations. We do not act as an event contractor, booking agent, broker, 
                or escrow intermediary. All vendor quotations, payments, and legal permits are negotiated independently by you.
              </p>
            </div>
          </div>

          {/* Interactive In-Flow Table of Contents */}
          <nav className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-coral" />
                <h2 className="font-serif font-bold text-primary text-sm sm:text-base">
                  Document Contents
                </h2>
              </div>
              <span className="text-xs text-muted">13 sections</span>
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

          {/* Document Sections */}
          <div className="space-y-10 text-xs sm:text-sm text-secondary leading-relaxed">
            {/* 1. Acceptance */}
            <section id="acceptance" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing, browsing, registering for an account, or otherwise utilizing the SynapseEvent website, 
                APIs, and planning atelier (collectively, the &ldquo;Platform&rdquo;), you acknowledge that you have read, 
                understood, and agree to be bound by these Terms &amp; Conditions (&ldquo;Terms&rdquo;) and our Privacy Policy. 
                If you do not agree to these Terms, you must not access or use the Platform.
              </p>
            </section>

            {/* 2. Platform Purpose */}
            <section id="platform-nature" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                2. Platform Purpose &amp; Advisory Nature
              </h2>
              <p>
                SynapseEvent is an intelligent celebration atelier engineered to assist hosts, families, and organizers 
                with organizing weddings, milestone birthdays, and community festivals.
              </p>
              <p>
                <strong>Computational Advisory Only:</strong> All plan syntheses, budget category allocations, 
                cost-per-guest metrics, reserve contingency suggestions, and milestone schedules generated by the 
                Platform or its AI engine are advisory planning benchmarks. They do not represent verified vendor prices, 
                formal quotations, contract offers, or guaranteed availability. Actual costs depend on vendor negotiations, 
                seasonal market fluctuations, regional supply, and host choices.
              </p>
            </section>

            {/* 3. Account Creation */}
            <section id="accounts" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                3. Account Creation &amp; Security
              </h2>
              <p>
                To unlock durable storage and multi-device access to your event workspace, you must create an account 
                using email and password authentication or authorized Google OAuth 2.0 sign-in.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>You must provide accurate, current, and complete registration information.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials and session cookies.</li>
                <li>You agree to immediately notify us of any unauthorized use or suspected security breach of your account.</li>
                <li>SynapseEvent is not liable for losses caused by unauthorized credential use when caused by host negligence.</li>
              </ul>
            </section>

            {/* 4. Permitted Use */}
            <section id="permitted-use" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                4. Permitted Use &amp; Prohibited Conduct
              </h2>
              <p>You agree to use the Platform strictly for legitimate event planning purposes. You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Use the Platform for any unlawful, fraudulent, or malicious purpose.</li>
                <li>Submit abusive, defamatory, obscene, or infringing content to AI copilot prompts or event workspaces.</li>
                <li>Attempt to decompile, reverse engineer, or compromise the integrity of our server algorithms or database schemas.</li>
                <li>Interfere with, bypass, or overburden our security systems, rate limiters, or server infrastructure.</li>
                <li>Employ automated scrapers, bots, or unauthorized crawlers without written consent.</li>
              </ul>
            </section>

            {/* 5. AI Limitations */}
            <section id="ai-limitations" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                5. AI-Generated Content &amp; Mathematical Limits
              </h2>
              <p>
                Our planning engine integrates generative artificial intelligence (via Google Gemini) alongside deterministic 
                integer arithmetic rules. While we enforce strict server validation to ensure itemized numbers sum accurately 
                without floating-point errors, you acknowledge that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>AI recommendations may occasionally contain regional, cultural, or factual inaccuracies.</li>
                <li>AI-suggested catering ratios, sound regulations, and vendor checklists should always be cross-checked with certified professionals.</li>
                <li>The host maintains 100% control to override, lock, edit, or delete any generated item in their workspace.</li>
              </ul>
            </section>

            {/* 6. Municipal Compliance */}
            <section id="compliance" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                6. Venue Rules, Sound &amp; Municipal Compliance
              </h2>
              <p>
                Celebration events in India and worldwide are governed by municipal regulations, environmental laws, and police guidelines:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>
                  <strong>Sound &amp; Loudspeaker Norms:</strong> Supreme Court of India directives and municipal laws impose 
                  strict 10:00 PM restrictions on outdoor loudspeakers and amplified sound. Timeline milestone reminders 
                  in SynapseEvent are prompts; obtaining appropriate police No Objection Certificates (NOC) and sound clearances 
                  is the host&rsquo;s sole responsibility.
                </li>
                <li>
                  <strong>Venue Clearances:</strong> Fire safety clearances, ground capacity buffers, alcohol/bar licenses (P-10/FL-4), 
                  and public assembly permissions must be obtained directly by you from local governing bodies.
                </li>
              </ul>
            </section>

            {/* 7. Vendors */}
            <section id="vendors" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                7. Third-Party Vendors &amp; Quotations
              </h2>
              <p>
                SynapseEvent provides workspace registers for you to manually record vendor enquiries, price quotes, 
                deposit receipts, and contract notes. SynapseEvent does not:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                <li>Vouch for the solvency, performance, punctuality, or quality of any third-party caterer, decorator, venue, or DJ.</li>
                <li>Process direct payment transactions, deposits, or escrow balances on behalf of vendors.</li>
                <li>Intervene in contractual disputes between event hosts and vendor partners.</li>
              </ul>
            </section>

            {/* 8. User Content */}
            <section id="user-content" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                8. User Content &amp; Workspace Data
              </h2>
              <p>
                You retain ownership of the event names, budgets, notes, guest counts, and personal choices you enter 
                into your workspace. You grant SynapseEvent a limited, non-exclusive license to process, store, and display 
                this data solely to provide the planning atelier functionality to you and your authorized collaborators.
              </p>
            </section>

            {/* 9. Intellectual Property */}
            <section id="intellectual-property" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                9. Intellectual Property
              </h2>
              <p>
                The SynapseEvent name, logo, software code, visual design, user interfaces, calculation engines, 
                and proprietary archetypes are the intellectual property of SynapseEvent. You may not copy, reproduce, 
                or exploit our brand or platform features without prior written permission.
              </p>
            </section>

            {/* 10. Availability */}
            <section id="availability" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                10. Service Availability &amp; Modifications
              </h2>
              <p>
                We strive to maintain continuous service availability. However, the Platform is provided on an &ldquo;as is&rdquo; 
                and &ldquo;as available&rdquo; basis. We reserve the right to modify, suspend, update, or discontinue features 
                with reasonable notice where feasible, including during system maintenance or security enhancements.
              </p>
            </section>

            {/* 11. Termination */}
            <section id="termination" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                11. Account Suspension &amp; Deletion
              </h2>
              <p>
                You may delete your account and associated event plans at any time through your workspace settings or by 
                submitting a deletion request. We reserve the right to suspend or terminate accounts that breach these Terms, 
                engage in malicious activity, or violate applicable laws.
              </p>
            </section>

            {/* 12. Liability */}
            <section id="liability" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                12. Disclaimers &amp; Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, SynapseEvent and its contributors disclaim all warranties, 
                express or implied, including merchantability, fitness for a particular event, and non-infringement. In no event 
                shall SynapseEvent be liable for indirect, incidental, punitive, or consequential damages arising out of vendor 
                failures, price variations, weather interruptions, municipal enforcement, or event cancellations.
              </p>
            </section>

            {/* 13. Owner Determinations */}
            <section id="owner-decisions" className="scroll-mt-24 space-y-3 pt-6 border-t border-border/60">
              <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                13. Contact &amp; Pending Owner Decisions
              </h2>
              <p>
                For inquiries, policy clarifications, or technical questions regarding these Terms, contact our administration 
                team at <code className="bg-surface px-1.5 py-0.5 rounded border border-border text-xs text-primary">curator@synapse-event.com</code>.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs space-y-2 text-secondary">
                <span className="font-bold text-amber-700 dark:text-amber-400 block">
                  Product Owner Deployment Notice:
                </span>
                <p>
                  Formal legal registration details, governing jurisdiction (e.g. courts of New Delhi / Bengaluru / Mumbai), 
                  and corporate grievance officer particulars are subject to final determination by the product owner prior to commercial launch.
                </p>
              </div>
            </section>
          </div>

          {/* Navigation and Back to Top Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-xs font-semibold text-secondary hover:text-primary transition"
              >
                &larr; Return to Home
              </Link>
              <a
                href="#top"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-coral transition"
              >
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
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
