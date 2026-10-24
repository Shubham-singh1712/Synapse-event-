import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import EventWizard, { WizardArchetype } from "@/components/wizard/EventWizard";
import { getCurrentUser } from "@/lib/auth/auth-service";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { validateArchetype } from "@/lib/auth/return-url";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const user = await getCurrentUser();

  const selectedArchetype: WizardArchetype = validateArchetype(type) || "WEDDING";

  // Authentication Gate: Require authenticated user before creating an event
  if (!user) {
    const returnUrl = `/events/new?type=${selectedArchetype}`;
    redirect(`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}&type=${selectedArchetype}`);
  }

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col justify-between p-4 sm:p-8 transition-colors">
      <div className="max-w-4xl mx-auto w-full py-4 space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition px-3 py-1.5 rounded-xl border border-border hover:bg-surface"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-champagne/15 text-secondary border border-champagne/30">
              <Sparkles className="w-3.5 h-3.5 text-coral" />
              <span>Celebration Architecture</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-primary tracking-tight">
            Create Your <span className="text-coral">Celebration Plan</span>
          </h1>
          <p className="text-sm text-muted max-w-lg mx-auto">
            Provide your constraints and parameters. SynapseEvent will synthesize an
            itemized budget envelope, relative timeline, and vendor checklist.
          </p>
        </div>

        {/* Multi-Step Event Wizard */}
        <EventWizard initialArchetype={selectedArchetype} />
      </div>

      <footer className="text-center text-muted text-xs py-6 border-t border-border mt-8">
        SynapseEvent • Coordinated Celebration Planning Atelier
      </footer>
    </div>
  );
}
