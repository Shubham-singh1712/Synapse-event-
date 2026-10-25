import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, FileText, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth-service";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import PublicFooter from "@/components/navigation/PublicFooter";

export const metadata: Metadata = {
  title: "Terms & Conditions — SynapseEvent Atelier",
  description:
    "Review the terms of service governing your use of SynapseEvent's celebration planning platform, deterministic budget calculations, and AI advisory tools.",
};

export default async function TermsPage() {
  const user = await getCurrentUser();

  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "platform-nature", title: "2. Platform Purpose & Advisory Nature" },
    { id: "accounts", title: "3. Account Creation & Security" },
    { id: "permitted-use", title: "4. Permitted Use & Prohibited Conduct" },
    { id: "ai-limitations", title: "5. AI-Generated Content & Math Limits" },
    { id: "compliance", title: "6. Venue Rules, Sound & Municipal Compliance" },
    { id: "vendors", title: "7. Third-Party Vendors & Quotations" },
    { id: "user-content", title: "8. User Content & Workspace Data" },
    { id: "intellectual-property", title: "9. Intellectual Property" },
    { id: "availability", title: "10. Service Availability & Changes" },
    { id: "termination", title: "11. Suspension & Account Termination" },
    { id: "liability", title: "12. Disclaimers & Limitation of Liability" },
    { id: "owner-decisions", title: "13. Contact & Owner Determinations" },
  ];

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col transition-colors duration-200">
      <PublicNavbar user={user} />

      <main className="flex-1">
        {/* Header Hero */}
        <section className="py-12 sm:py-16 bg-surface border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne/15 border border-champagne/30 text-xs font-semibold text-secondary">
              <FileText className="w-3.5 h-3.5 text-coral" />
              <span>Legal &amp; Operational Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-black text-primary tracking-tight">
              Terms &amp; Conditions
            </h1>
            <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed">
              Last updated: October 25, 2026 • Please read these terms carefully before creating a celebration plan or using the SynapseEvent platform.
            </p>
          </div>
        </section>

        {/* Content Body */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Table of Contents Sticky Sidebar */}
            <aside className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-28 bg-surface border border-border rounded-2xl p-4 space-y-3 text-xs">
                <span className="font-serif font-bold text-primary block border-b border-border pb-2">
                  Contents
                </span>
                <nav className="space-y-1.5 text-muted">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="block hover:text-coral transition-colors py-0.5 leading-snug"
                    >
                      {sec.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Legal Document Content */}
            <div className="lg:col-span-3 space-y-10 text-xs sm:text-sm text-secondary leading-relaxed">
              {/* Highlight Callout */}
              <div className="bg-surface border border-border rounded-2xl p-5 flex items-start gap-3.5 shadow-subtle">
                <AlertCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-primary text-sm">
                    Core Platform Summary
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    SynapseEvent provides software tools for computational budget tracking, relative celebration timelines, 
                    and AI-assisted planning recommendations. We do not act as an event contractor, booking agent, broker, 
                    or escrow intermediary. All vendor quotations, payments, and legal permits are negotiated independently by you.
                  </p>
                </div>
              </div>

              {/* 1. Acceptance */}
              <section id="acceptance" className="space-y-3 pt-2">
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
              <section id="platform-nature" className="space-y-3">
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
              <section id="accounts" className="space-y-3">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                  3. Account Creation &amp; Security
                </h2>
                <p>
                  To unlock durable storage and multi-device access to your event workspace, you must create an account 
                  using email and password authentication or authorized Google OAuth 2.0 sign-in.
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
                  <li>You must provide accurate, current, and complete registration information.</li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials and session cookies.</li>
                  <li>You agree to immediately notify us of any unauthorized use or suspected security breach of your account.</li>
                  <li>SynapseEvent is not liable for losses caused by unauthorized credential use when caused by host negligence.</li>
                </ul>
              </section>

              {/* 4. Permitted Use */}
              <section id="permitted-use" className="space-y-3">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                  4. Permitted Use &amp; Prohibited Conduct
                </h2>
                <p>You agree to use the Platform strictly for legitimate event planning purposes. You agree not to:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
                  <li>Use the Platform for any unlawful, fraudulent, or malicious purpose.</li>
                  <li>Submit abusive, defamatory, obscene, or infringing content to AI copilot prompts or event workspaces.</li>
                  <li>Attempt to decompile, reverse engineer, or compromise the integrity of our server algorithms or database schemas.</li>
                  <li>Interfere with, bypass, or overburden our security systems, rate limiters, or server infrastructure.</li>
                  <li>Employ automated scrapers, bots, or unauthorized crawlers without written consent.</li>
                </ul>
              </section>

              {/* 5. AI Limitations */}
              <section id="ai-limitations" className="space-y-3">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                  5. AI-Generated Content &amp; Mathematical Limits
                </h2>
                <p>
                  Our planning engine integrates generative artificial intelligence (via Google Gemini) alongside deterministic 
                  integer arithmetic rules. While we enforce strict server validation to ensure itemized numbers sum accurately 
                  without floating-point errors, you acknowledge that:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
                  <li>AI recommendations may occasionally contain regional, cultural, or factual inaccuracies.</li>
                  <li>AI-suggested catering ratios, sound regulations, and vendor checklists should always be cross-checked with certified professionals.</li>
                  <li>The host maintains 100% control to override, lock, edit, or delete any generated item in their workspace.</li>
                </ul>
              </section>

              {/* 6. Municipal Compliance */}
              <section id="compliance" className="space-y-3">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                  6. Venue Rules, Sound &amp; Municipal Compliance
                </h2>
                <p>
                  Celebration events in India and worldwide are governed by municipal regulations, environmental laws, and police guidelines:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
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
              <section id="vendors" className="space-y-3">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-primary">
                  7. Third-Party Vendors &amp; Quotations
                </h2>
                <p>
                  SynapseEvent provides workspace registers for you to manually record vendor enquiries, price quotes, 
                  deposit receipts, and contract notes. SynapseEvent does not:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs">
                  <li>Vouch for the solvency, performance, punctuality, or quality of any third-party caterer, decorator, venue, or DJ.</li>
                  <li>Process direct payment transactions, deposits, or escrow balances on behalf of vendors.</li>
                  <li>Intervene in contractual disputes between event hosts and vendor partners.</li>
                </ul>
              </section>

              {/* 8. User Content */}
              <section id="user-content" className="space-y-3">
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
              <section id="intellectual-property" className="space-y-3">
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
              <section id="availability" className="space-y-3">
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
              <section id="termination" className="space-y-3">
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
              <section id="liability" className="space-y-3">
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
              <section id="owner-decisions" className="space-y-3 pt-4 border-t border-border">
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

              {/* Back to Planning CTA */}
              <div className="pt-8 flex items-center justify-between border-t border-border">
                <Link
                  href="/"
                  className="text-xs font-semibold text-secondary hover:text-primary transition"
                >
                  &larr; Return to Home
                </Link>
                <Link
                  href={user ? "/dashboard" : "/sign-up"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-coral hover:bg-coral-hover text-white shadow-coral transition"
                >
                  <span>{user ? "Open Dashboard" : "Start Planning"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
