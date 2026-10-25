import React from "react";
import Link from "next/link";
import { Shield, Heart } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface py-12 sm:py-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="SynapseEvent Home">
              <div className="w-8 h-8 rounded-xl bg-coral flex items-center justify-center text-white font-serif font-black shadow-sm group-hover:scale-105 transition text-base">
                S
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-primary">
                Synapse<span className="text-coral">Event</span>
              </span>
            </Link>
            <p className="text-xs text-muted leading-relaxed max-w-sm">
              Intelligent celebration architecture uniting mathematical budget precision, 
              multi-ceremony timeline ladders, and AI-assisted event coordination.
            </p>
            <div className="inline-flex items-center gap-2 text-[11px] text-muted bg-page px-3 py-1 rounded-lg border border-border">
              <Shield className="w-3.5 h-3.5 text-coral shrink-0" />
              <span>Exact Integer Arithmetic (Paise)</span>
            </div>
          </div>

          {/* Event Archetypes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-serif">
              Event Archetypes
            </h4>
            <ul className="space-y-2 text-xs text-secondary">
              <li>
                <Link href="/#event-types" className="hover:text-coral transition-colors">
                  Weddings &amp; Sangeet
                </Link>
              </li>
              <li>
                <Link href="/#event-types" className="hover:text-coral transition-colors">
                  Milestone Birthdays
                </Link>
              </li>
              <li>
                <Link href="/#event-types" className="hover:text-coral transition-colors">
                  Community &amp; Cultural Fests
                </Link>
              </li>
              <li>
                <Link href="/#preview" className="hover:text-coral transition-colors">
                  Studio Interface Preview
                </Link>
              </li>
            </ul>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-serif">
              Capabilities
            </h4>
            <ul className="space-y-2 text-xs text-secondary">
              <li>
                <Link href="/#capabilities" className="hover:text-coral transition-colors">
                  Paise-Accurate Budget Ledger
                </Link>
              </li>
              <li>
                <Link href="/#capabilities" className="hover:text-coral transition-colors">
                  Relative Milestone Ladders
                </Link>
              </li>
              <li>
                <Link href="/#capabilities" className="hover:text-coral transition-colors">
                  Vendor Quotation Tracking
                </Link>
              </li>
              <li>
                <Link href="/#capabilities" className="hover:text-coral transition-colors">
                  Gemini Celebration Copilot
                </Link>
              </li>
              <li>
                <Link href="/#capabilities" className="hover:text-coral transition-colors">
                  India Compliance &amp; 10 PM NOCs
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Account */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-serif">
              Legal &amp; Trust
            </h4>
            <ul className="space-y-2 text-xs text-secondary">
              <li>
                <Link href="/terms" className="hover:text-coral transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-coral transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-coral transition-colors">
                  Sign In to Workspace
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:text-coral transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright Bottom Bar */}
        <div className="border-t border-border pt-8 space-y-3">
          <p className="text-[11px] text-muted leading-relaxed">
            <strong className="text-primary font-medium">Advisory Notice:</strong> SynapseEvent provides computational 
            budgeting benchmarks, timeline schedules, and AI-assisted recommendations. Generated calculations are planning 
            estimates and do not constitute confirmed vendor contracts, price guarantees, or legal permits. Police sound 
            NOCs, municipal loudspeaker compliance (10 PM limits), and venue clearances must be verified directly with local authorities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted pt-2">
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-coral" />
              <span>SynapseEvent • Deterministic Celebration Planning Atelier</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
