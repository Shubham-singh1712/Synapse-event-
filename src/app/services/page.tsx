import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  Shield,
  FileCheck2,
  ArrowRight,
  ChevronRight,
  Heart,
  PartyPopper,
  Flag,
  MessageSquare,
  IndianRupee,
  AlertCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth-service";
import PublicNavbar from "@/components/navigation/PublicNavbar";
import PublicFooter from "@/components/navigation/PublicFooter";

export const metadata: Metadata = {
  title: "Services & Capabilities — SynapseEvent Atelier",
  description:
    "Explore SynapseEvent's complete celebration planning capabilities: exact integer paise budgets, relative multi-ceremony timelines, vendor quotation tracking, and AI-grounded planning assistance.",
};

export default async function ServicesPage() {
  const user = await getCurrentUser();

  const services = [
    {
      id: "budget-management",
      icon: IndianRupee,
      title: "Paise-Accurate Budget Ledger",
      badge: "Mathematical Integrity",
      description:
        "Every rupee is tracked down to the exact integer paise on the server. Eliminate floating-point rounding errors and gain clarity across committed bookings, tentative quotes, and unallocated contingency buffers.",
      features: [
        "Server-computed integer math with zero floating-point drift",
        "Configurable reserve contingency buffer (default 7%–10% safety cushion)",
        "Dynamic cost-per-guest breakdown calculated across all attendees",
        "Guest-sensitive line item scaling when headcount changes",
      ],
    },
    {
      id: "relative-timelines",
      icon: Clock,
      title: "Relative Milestone & Checklist Ladders",
      badge: "Connected Schedules",
      description:
        "Plan backwards from your celebration date with relative lead-time schedules. Whether orchestrating a 9-month royal wedding or a 4-week milestone birthday, you always know what decision is due next.",
      features: [
        "Relative day offsets calculated automatically from your target date",
        "Milestone status tracking (Pending, In Progress, Completed)",
        "Categorized ceremony checkpoints (Sangeet, Mehendi, Haldi, Reception)",
        "Crucial compliance deadlines (e.g., 90-day venue advances & police NOCs)",
      ],
    },
    {
      id: "vendor-coordination",
      icon: FileCheck2,
      title: "Vendor Quotations & Contract Tracking",
      badge: "Coordination Atelier",
      description:
        "Keep vendor enquiries, price quotations, deposit balances, and negotiation notes organized in one place. SynapseEvent is a coordination tool that keeps your contracts and conversations transparent.",
      features: [
        "Track quoted amounts versus negotiated advance payments and balances",
        "Pre-populated essential questions to ask caterers, decorators, and DJs",
        "Isolated records for banquet lawns, sound, photography, and bakers",
        "Clear status flags: Researching, Contacted, Quoted, Booked",
      ],
    },
    {
      id: "copilot-assistant",
      icon: MessageSquare,
      title: "Celebration Copilot (Gemini AI)",
      badge: "Context-Grounded AI",
      description:
        "Ask targeted questions about your budget, timeline adjustments, regional traditions, or catering ratios. The assistant is grounded directly in your active event parameters and budget envelopes.",
      features: [
        "Question-aware advisory that directly addresses budget additions and changes",
        "Estimates incremental costs rather than repeating generic advisories",
        "Cultural intelligence across North, South, East, and Western Indian ceremonies",
        "Clean, human-readable answers without unformatted code artifacts",
      ],
    },
    {
      id: "inspiration-studio",
      icon: Sparkles,
      title: "Visual Inspiration & Theme Studio",
      badge: "Aesthetic Direction",
      description:
        "Curate evocative color palettes, decor motifs, and menu ideas tailored to your setting. Visualize your celebration aesthetic before committing deposits with vendors.",
      features: [
        "Curated visual moodboards with celebration photography and palettes",
        "Regional specialty dish recommendations and live food station concepts",
        "Entertainment ideas spanning folk artists, choreographers, and acoustic sets",
        "Theme presets: Royal Marwar Palace, Pastel Garden, Bollywood Retro, Eco-Fest",
      ],
    },
    {
      id: "compliance-safeguards",
      icon: Shield,
      title: "Sound & Municipal Compliance Verification",
      badge: "Practical Safety",
      description:
        "Celebrations must abide by local civil laws. SynapseEvent automatically surfaces compliance reminders for police permissions, fire clearances, and 10 PM outdoor loudspeaker restrictions.",
      features: [
        "10 PM loudspeaker cut-off reminders embedded into evening timelines",
        "Police sound NOC checkpoints tailored for public and private grounds",
        "Venue capacity buffer suggestions to ensure fire and safety compliance",
        "Clear demarcation between advisory estimates and municipal permits",
      ],
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Choose an Event Archetype",
      description:
        "Select from specialized celebration archetypes — Wedding, Milestone Birthday, or Community Gathering — each pre-wired with domain-specific logic.",
    },
    {
      number: "02",
      title: "Provide Event Parameters",
      description:
        "Input your target celebration date, celebration city or venue, total financial budget, estimated guest count, and cultural preferences.",
    },
    {
      number: "03",
      title: "Explore the Synthesized Plan",
      description:
        "The system generates an itemized integer paise budget envelope, relative milestone calendar, and vendor enquiry checklist.",
    },
    {
      number: "04",
      title: "Tailor the Budget & Milestones",
      description:
        "Lock budget allocations, add custom expense items, adjust headcount sensitivity, and adapt milestone due dates to your host schedule.",
    },
    {
      number: "05",
      title: "Coordinate Vendors & Track Progress",
      description:
        "Log vendor quotations, record advance deposits, consult the Gemini AI copilot for adjustments, and execute your celebration with calm confidence.",
    },
  ];

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col transition-colors duration-200">
      {/* Navigation */}
      <PublicNavbar user={user} />

      <main className="flex-1">
        {/* Header Hero Section */}
        <section className="py-14 sm:py-20 bg-surface border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-champagne/15 border border-champagne/30 text-xs font-semibold text-secondary tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-coral" />
              <span>Coordinated Celebration Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black text-primary tracking-tight leading-tight">
              Everything your celebration needs,{" "}
              <span className="text-coral italic font-normal block sm:inline">in one place.</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              From exact integer-paise budgets to multi-ceremony timelines and AI advisory, 
              SynapseEvent replaces chaotic spreadsheets with coordinated celebration intelligence.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={user ? "/dashboard" : "/sign-up"}
                id="services-primary-cta"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold bg-coral hover:bg-coral-hover text-white shadow-coral transition-all transform hover:-translate-y-0.5"
              >
                {user ? "Open Your Dashboard" : "Start Planning Free"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/#event-types"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-xl text-sm font-semibold text-secondary hover:text-primary bg-page border border-border hover:bg-surface transition-all"
              >
                <span>Browse Archetypes</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 5-Step Journey Section */}
        <section className="py-16 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-coral">
              The Planning Journey
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-primary">
              How You Plan with SynapseEvent
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              A structured five-step workflow designed to take you from initial idea to coordinated execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-6">
            {steps.map((st) => (
              <div
                key={st.number}
                className="bg-surface border border-border rounded-2xl p-5 space-y-3 relative group hover:border-coral/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="font-serif font-black text-2xl text-coral/70 block mb-2">
                    {st.number}
                  </span>
                  <h3 className="text-sm font-bold text-primary font-serif mb-1.5">
                    {st.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {st.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Core Capabilities Detailed Grid */}
        <section className="py-16 sm:py-20 bg-surface border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto space-y-3 mb-12 sm:mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-coral">
                Core Capabilities
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif font-black text-primary">
                Built for Genuine Celebration Complexity
              </h2>
              <p className="text-xs sm:text-sm text-muted">
                Each service is engineered around real-world celebration challenges: guest count fluctuations, advance payment schedules, and cultural tradition nuances.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((srv) => {
                const IconComponent = srv.icon;
                return (
                  <div
                    key={srv.id}
                    className="bg-page border border-border rounded-3xl p-6 sm:p-7 space-y-4 hover:shadow-card hover:border-coral/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-xl bg-coral/10 text-coral flex items-center justify-center">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-champagne/15 text-champagne-dark dark:text-champagne border border-champagne/30">
                          {srv.badge}
                        </span>
                      </div>
                      <h3 className="text-lg font-serif font-bold text-primary">
                        {srv.title}
                      </h3>
                      <p className="text-xs text-muted leading-relaxed">
                        {srv.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/80">
                      <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-2">
                        Included Features
                      </span>
                      <ul className="space-y-1.5 text-xs text-secondary">
                        {srv.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-coral mt-1.5 shrink-0" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Celebration Archetypes Showcase Callout */}
        <section className="py-16 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-coral">
              Celebration Archetypes
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-primary">
              Tailored Workflows for Every Scale
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Select an archetype to launch directly into an authenticated planning workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Wedding */}
            <div className="bg-surface border border-border rounded-3xl p-7 space-y-5 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-primary mb-2">Weddings</h3>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  Multi-ceremony coordination spanning Sangeet, Mehendi, Haldi, Pheras, and Reception. 
                  Calculates guest-sensitive catering ratios, mandap decor, and advance payment deadlines.
                </p>
              </div>
              <Link
                href={user ? "/events/new?type=WEDDING" : `/sign-in?returnUrl=${encodeURIComponent("/events/new?type=WEDDING")}&type=WEDDING`}
                className="inline-flex items-center justify-between w-full pt-4 border-t border-border text-xs font-bold text-coral hover:text-coral-hover group"
              >
                <span>Plan a Wedding</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Birthday */}
            <div className="bg-surface border border-border rounded-3xl p-7 space-y-5 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-champagne/20 text-champagne-dark dark:text-champagne flex items-center justify-center mb-4">
                  <PartyPopper className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-primary mb-2">Milestone Birthdays</h3>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  Curated celebration planning emphasizing party venues, custom bakeries, theme decor, 
                  DJ entertainment, return gifts, and compact 4-week execution schedules.
                </p>
              </div>
              <Link
                href={user ? "/events/new?type=BIRTHDAY" : `/sign-in?returnUrl=${encodeURIComponent("/events/new?type=BIRTHDAY")}&type=BIRTHDAY`}
                className="inline-flex items-center justify-between w-full pt-4 border-t border-border text-xs font-bold text-coral hover:text-coral-hover group"
              >
                <span>Plan a Birthday</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Community */}
            <div className="bg-surface border border-border rounded-3xl p-7 space-y-5 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-plum/10 dark:bg-plum/30 text-plum dark:text-secondary flex items-center justify-center mb-4">
                  <Flag className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-primary mb-2">Community Events</h3>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  Public festivals, society fests, and cultural utsavs centering on police NOC verification, 
                  10 PM outdoor loudspeaker compliance, volunteer shifts, and ground capacity buffers.
                </p>
              </div>
              <Link
                href={user ? "/events/new?type=COMMUNITY" : `/sign-in?returnUrl=${encodeURIComponent("/events/new?type=COMMUNITY")}&type=COMMUNITY`}
                className="inline-flex items-center justify-between w-full pt-4 border-t border-border text-xs font-bold text-coral hover:text-coral-hover group"
              >
                <span>Plan a Community Event</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Advisory Boundaries Notice */}
        <section className="py-10 bg-surface border-y border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-page border border-border rounded-2xl p-5 sm:p-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-coral shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs text-secondary leading-relaxed">
                <h3 className="font-serif font-bold text-primary text-sm">
                  What SynapseEvent Does — and What It Does Not Do
                </h3>
                <p>
                  <strong>What we provide:</strong> An intelligent planning atelier with mathematical budget calculations, 
                  relative schedule timelines, vendor contract tracking, and AI-powered recommendations.
                </p>
                <p className="text-muted">
                  <strong>What we do not do:</strong> We are not a direct booking broker, escrow agent, or event contractor. 
                  We do not accept payments on behalf of vendors or guarantee vendor quotes. All vendor engagements, price negotiations, 
                  and municipal permissions (such as police sound NOCs) are the sole legal responsibility of the host.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-20 text-center max-w-3xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-5">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black text-primary tracking-tight">
            Ready to experience calm planning?
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-muted max-w-lg mx-auto leading-relaxed">
            Create your celebration plan in under two minutes with an itemized budget envelope and connected timeline.
          </p>
          <div className="pt-2">
            <Link
              href={user ? "/dashboard" : "/sign-up"}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold bg-coral hover:bg-coral-hover text-white shadow-coral transition-all transform hover:-translate-y-0.5"
            >
              {user ? "Open Your Dashboard" : "Start Planning Free"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Shared Footer */}
      <PublicFooter />
    </div>
  );
}
