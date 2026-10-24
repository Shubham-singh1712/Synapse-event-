import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Database } from "lucide-react";
import { getEventWithPlan } from "@/lib/services/event-service";
import { getOrCreateWorkspaceSession } from "@/lib/auth/session-helper";
import { UnauthorizedError } from "@/lib/auth/guest-workspace";
import { DatabaseConfigurationError } from "@/lib/db/client";
import EventWorkspaceClient from "@/components/workspace/EventWorkspaceClient";
import ThemeToggle from "@/components/theme/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function EventPlanningWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const session = await getOrCreateWorkspaceSession();

  let planData;
  let isDbUnconfigured = false;

  try {
    planData = await getEventWithPlan(eventId, {
      workspaceId: session.workspaceId,
      userId: session.user?.id,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return (
        <main className="min-h-screen bg-page text-primary flex flex-col justify-between p-6">
          <div className="max-w-6xl mx-auto w-full flex justify-end">
            <ThemeToggle />
          </div>
          <div className="max-w-md mx-auto bg-surface border border-border rounded-3xl p-8 shadow-soft text-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
            <h1 className="font-serif text-2xl font-bold text-primary mb-2">Access Denied</h1>
            <p className="text-muted text-sm mb-6">
              This celebration belongs to another account or guest workspace session.
            </p>
            <Link
              href={session.isAuthenticated ? "/dashboard" : "/"}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-semibold shadow-coral transition"
            >
              Return to {session.isAuthenticated ? "Dashboard" : "Home"}
            </Link>
          </div>
          <div />
        </main>
      );
    }
    if (error instanceof DatabaseConfigurationError) {
      isDbUnconfigured = true;
    }
  }

  if (isDbUnconfigured) {
    return (
      <main className="min-h-screen bg-page text-primary flex flex-col justify-between p-6">
        <div className="max-w-6xl mx-auto w-full flex justify-end">
          <ThemeToggle />
        </div>
        <div className="max-w-md mx-auto bg-surface border border-border rounded-3xl p-8 shadow-soft text-center space-y-4">
          <Database className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-primary">Database Unprovisioned</h1>
          <p className="text-muted text-xs leading-relaxed">
            Persistence is currently in unprovisioned mode. Configure{" "}
            <code className="text-amber-700 dark:text-amber-300 bg-page px-1.5 py-0.5 rounded border border-border">DATABASE_URL</code> in{" "}
            <code className="text-amber-700 dark:text-amber-300 bg-page px-1.5 py-0.5 rounded border border-border">.env.local</code> to
            retrieve saved events.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-xs font-semibold shadow-coral transition"
            >
              Return Home
            </Link>
          </div>
        </div>
        <div />
      </main>
    );
  }

  if (!planData) {
    notFound();
  }

  return (
    <EventWorkspaceClient
      initialPlan={planData}
      isAuthenticated={session.isAuthenticated}
      backUrl={session.isAuthenticated ? "/dashboard" : "/"}
    />
  );
}
