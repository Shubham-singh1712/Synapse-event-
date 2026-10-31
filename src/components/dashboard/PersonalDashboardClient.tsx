"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  Calendar,
  Users,
  IndianRupee,
  ArrowRight,
  Trash2,
  AlertTriangle,
  LogOut,
  Heart,
  PartyPopper,
  Flag,
  Database,
  Layers,
  Clock,
  Edit3,
  X,
} from "lucide-react";
import { formatCentsToCurrency, toCents } from "@/lib/domain/money";
import { formatIndianDate } from "@/lib/domain/i18n";
import { validateEventDate } from "@/lib/domain/schemas";
import type { UserEventSummaryItem } from "@/lib/services/event-service";
import type { AuthenticatedUser } from "@/lib/auth/auth-service";
import ThemeToggle from "@/components/theme/ThemeToggle";

interface Props {
  user: AuthenticatedUser;
  initialEvents: UserEventSummaryItem[];
  isDbUnconfigured: boolean;
}

export default function PersonalDashboardClient({
  user,
  initialEvents,
  isDbUnconfigured,
}: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<UserEventSummaryItem[]>(initialEvents);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Event Details State
  const [editingEvent, setEditingEvent] = useState<UserEventSummaryItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editGuests, setEditGuests] = useState("");
  const [editBudgetINR, setEditBudgetINR] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (ev: UserEventSummaryItem) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditDate(ev.eventDate);
    setEditLocation(ev.location);
    setEditGuests(ev.guestCount.toString());
    setEditBudgetINR(Math.round(ev.totalBudgetCents / 100).toString());
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    if (!editTitle.trim()) {
      setEditError("Event title cannot be empty.");
      return;
    }

    const dateCheck = validateEventDate(editDate);
    if (!dateCheck.isValid) {
      setEditError(dateCheck.error || "Invalid event date.");
      return;
    }

    const guestCount = parseInt(editGuests, 10);
    if (isNaN(guestCount) || guestCount <= 0) {
      setEditError("Guest count must be at least 1.");
      return;
    }

    const budgetMinorUnits = toCents(parseFloat(editBudgetINR) || 0);
    if (budgetMinorUnits < 0) {
      setEditError("Budget cannot be negative.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_EVENT_DETAILS",
          updates: {
            title: editTitle.trim(),
            eventDate: editDate,
            location: editLocation.trim() || "TBD",
            guestCount,
            totalBudgetCents: budgetMinorUnits,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update event details.");
      }

      // Compute updated daysUntilEvent
      const today = new Date().toISOString().split("T")[0]!;
      const eventTime = new Date(`${editDate}T00:00:00Z`).getTime();
      const todayTime = new Date(`${today}T00:00:00Z`).getTime();
      const daysUntilEvent = Math.ceil((eventTime - todayTime) / 86400000);

      setEvents((prev) =>
        prev.map((item) =>
          item.id === editingEvent.id
            ? {
                ...item,
                title: editTitle.trim(),
                eventDate: editDate,
                location: editLocation.trim() || "TBD",
                guestCount,
                totalBudgetCents: budgetMinorUnits,
                daysUntilEvent,
              }
            : item
        )
      );

      setEditingEvent(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error saving event.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setIsDeletingId(eventId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete event.");
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setDeleteConfirmId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error deleting event.");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Group total managed budget by currency to prevent cross-currency arithmetic (memoized against events array)
  const totalsByCurrency = useMemo(() => {
    return events.reduce<Record<string, number>>((acc, e) => {
      const curr = e.currency || "INR";
      acc[curr] = (acc[curr] || 0) + (e.totalBudgetCents || 0);
      return acc;
    }, {});
  }, [events]);

  const formattedTotals = useMemo(() => {
    return Object.entries(totalsByCurrency).map(([curr, amount]) =>
      formatCentsToCurrency(amount, curr)
    );
  }, [totalsByCurrency]);

  const upcomingCount = useMemo(() => {
    return events.filter((e) => e.daysUntilEvent >= 0).length;
  }, [events]);

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col justify-between transition-colors">
      {/* Navigation Bar with enhanced contrast */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1A1320]/95 backdrop-blur-xl border-b border-border/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-plum flex items-center justify-center text-champagne font-serif font-black shadow-soft group-hover:scale-105 transition">
              S
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-primary">
                Synapse<span className="text-coral">Event</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-widest text-muted -mt-0.5">
                Planning Atelier
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-primary">{user.name}</span>
              <span className="text-[11px] text-muted">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              id="dashboard-sign-out-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-elevated border border-border transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Welcome & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-champagne/15 border border-champagne/30 text-[11px] font-semibold text-secondary tracking-wide mb-2">
              <Sparkles className="w-3 h-3 text-coral" />
              <span>Personal Celebration Suite</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-primary tracking-tight">
              Welcome back, <span className="text-coral">{user.name.split(" ")[0]}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Curate your celebrations, track real vendor commitments, and manage integer-paise budgets.
            </p>
          </div>

          <Link
            href="/events/new"
            id="dashboard-create-event-btn"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-coral hover:bg-coral-hover text-white font-semibold text-xs shadow-coral transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>

        {/* Database Unprovisioned Notice */}
        {isDbUnconfigured && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
              <Database className="w-4 h-4 shrink-0" />
              <span>Database Persistence Unprovisioned</span>
            </div>
            <p className="text-secondary leading-relaxed">
              Managed PostgreSQL is not connected. Saved events cannot be loaded from the database
              until <code className="text-amber-700 dark:text-amber-300 bg-surface px-1.5 py-0.5 rounded border border-border">DATABASE_URL</code> is configured in <code className="text-amber-700 dark:text-amber-300 bg-surface px-1.5 py-0.5 rounded border border-border">.env.local</code>.
            </p>
          </div>
        )}

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-600 dark:text-red-300 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Summary Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft">
            <div className="flex items-center justify-between text-muted text-xs mb-1">
              <span className="font-medium">Total Celebrations</span>
              <Layers className="w-4 h-4 text-plum dark:text-champagne" />
            </div>
            <span className="font-serif text-3xl font-bold text-primary">{events.length}</span>
            <span className="text-[11px] text-muted block mt-1">Active planned occasions</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft">
            <div className="flex items-center justify-between text-muted text-xs mb-1">
              <span className="font-medium">Upcoming Events</span>
              <Calendar className="w-4 h-4 text-coral" />
            </div>
            <span className="font-serif text-3xl font-bold text-primary">{upcomingCount}</span>
            <span className="text-[11px] text-muted block mt-1">Scheduled on the calendar</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft">
            <div className="flex items-center justify-between text-muted text-xs mb-1">
              <span className="font-medium">Total Budget Managed</span>
              <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-primary truncate block">
              {formattedTotals.length > 0 ? formattedTotals.join(" + ") : "₹0"}
            </span>
            <span className="text-[11px] text-muted block mt-1">Preserved integer ledger</span>
          </div>
        </div>

        {/* Events Grid or Real Empty State */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
              <span>Your Celebrations</span>
              <span className="text-xs font-sans font-medium text-muted">
                ({events.length} {events.length === 1 ? "event" : "events"})
              </span>
            </h2>
          </div>

          {events.length === 0 ? (
            /* Real Empty State */
            <div className="bg-surface border border-border rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-soft">
              <div className="w-16 h-16 rounded-2xl bg-champagne/20 border border-champagne/40 text-coral mx-auto flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="font-serif text-2xl font-bold text-primary">No celebrations planned yet</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Start your first celebration plan with tailored integer-paise budgets,
                  relative milestone schedules, and curated vendor task checklists.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/events/new?type=WEDDING"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-champagne/15 text-primary border border-champagne/40 hover:bg-champagne/25 transition shadow-sm"
                >
                  <Heart className="w-4 h-4 text-coral" />
                  Plan a Wedding (Pheras, Sangeet, Mehendi)
                </Link>
                <Link
                  href="/events/new?type=BIRTHDAY"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-coral/10 text-coral border border-coral/30 hover:bg-coral/20 transition shadow-sm"
                >
                  <PartyPopper className="w-4 h-4 text-coral" />
                  Plan a Milestone Birthday
                </Link>
                <Link
                  href="/events/new?type=COMMUNITY"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-plum/10 dark:bg-plum/30 text-primary border border-plum/20 hover:bg-plum/20 transition shadow-sm"
                >
                  <Flag className="w-4 h-4 text-plum dark:text-champagne" />
                  Plan a Community Utsav or Gathering
                </Link>
              </div>
            </div>
          ) : (
            /* Real Event Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((ev) => {
                const completionPercent =
                  ev.totalMilestones > 0
                    ? Math.round((ev.completedMilestones / ev.totalMilestones) * 100)
                    : 0;

                // Subtle archetype styling
                const isWedding = ev.archetype === "WEDDING";
                const isBirthday = ev.archetype === "BIRTHDAY";
                const badgeClass = isWedding
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                  : isBirthday
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                  : "bg-plum/10 dark:bg-plum/30 text-plum dark:text-champagne border-plum/20";

                const ArchetypeIcon = isWedding ? Heart : isBirthday ? PartyPopper : Flag;

                return (
                  <div
                    key={ev.id}
                    className="bg-surface border border-border hover:border-coral/50 rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 shadow-soft hover:shadow-md space-y-5 group"
                  >
                    <div>
                      {/* Top badge & actions */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${badgeClass}`}
                        >
                          <ArchetypeIcon className="w-3 h-3" />
                          <span>{ev.archetype}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(ev)}
                            className="p-1.5 rounded-lg text-muted hover:text-coral hover:bg-surface-elevated transition"
                            title="Edit Event Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {deleteConfirmId === ev.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteEvent(ev.id)}
                                disabled={isDeletingId === ev.id}
                                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold"
                              >
                                {isDeletingId === ev.id ? "Deleting..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded bg-surface-elevated text-secondary text-[10px] border border-border"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(ev.id)}
                              className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-surface-elevated transition"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Event Title */}
                      <h3 className="font-serif text-xl font-bold text-primary line-clamp-1 mb-2 group-hover:text-coral transition-colors">
                        {ev.title}
                      </h3>

                      {/* Event Meta Details */}
                      <div className="space-y-2 text-xs text-muted">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-coral shrink-0" />
                          <span className="text-secondary font-medium">
                            {formatIndianDate(ev.eventDate)}{" "}
                            <span className="text-muted font-normal">
                              ({ev.daysUntilEvent >= 0 ? `in ${ev.daysUntilEvent} days` : "passed"})
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-champagne shrink-0" />
                          <span className="text-secondary font-medium">{ev.guestCount} Guests</span>
                          <span className="text-muted">•</span>
                          <span className="truncate">{ev.location}</span>
                        </div>
                      </div>

                      {/* Budget row */}
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-muted font-medium">Total Budget:</span>
                        <span className="font-serif text-base font-bold text-primary">
                          {formatCentsToCurrency(ev.totalBudgetCents, ev.currency || "INR")}
                        </span>
                      </div>

                      {/* Milestone Progress Bar */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Milestones
                          </span>
                          <span className="text-secondary font-medium">
                            {ev.completedMilestones}/{ev.totalMilestones} ({completionPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-page rounded-full overflow-hidden border border-border">
                          <div
                            className="h-full bg-coral rounded-full transition-all duration-300"
                            style={{ width: `${completionPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Open Planning Workspace CTA */}
                    <Link
                      href={`/events/${ev.id}`}
                      className="w-full mt-4 py-2.5 rounded-xl bg-plum hover:bg-plum/90 text-white font-medium text-xs flex items-center justify-center gap-2 transition shadow-soft"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 text-champagne" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Edit Event Details Modal */}
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-soft space-y-5 animate-scale-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-primary">Edit Celebration Details</h3>
                  <p className="text-xs text-muted mt-0.5">Update core parameters for this planned occasion</p>
                </div>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface-elevated transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                  {editError}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-secondary mb-1">Celebration Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-page border border-border text-primary focus:outline-none focus:ring-2 focus:ring-coral text-xs"
                    placeholder="e.g. Sharma &amp; Verma Royal Wedding"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-secondary mb-1">Event Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-page border border-border text-primary focus:outline-none focus:ring-2 focus:ring-coral text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-secondary mb-1">Expected Guests</label>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={editGuests}
                      onChange={(e) => setEditGuests(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-page border border-border text-primary focus:outline-none focus:ring-2 focus:ring-coral text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-secondary mb-1">Location / Venue City</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-page border border-border text-primary focus:outline-none focus:ring-2 focus:ring-coral text-xs"
                    placeholder="e.g. Udaipur, Rajasthan"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-secondary mb-1">Total Target Budget (INR ₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editBudgetINR}
                    onChange={(e) => setEditBudgetINR(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-page border border-border text-primary focus:outline-none focus:ring-2 focus:ring-coral text-xs"
                    placeholder="e.g. 1500000"
                    required
                  />
                  <span className="text-[10px] text-muted block mt-1">Stored as precise integer paise in the financial ledger.</span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    disabled={isSavingEdit}
                    className="px-4 py-2.5 rounded-xl border border-border text-secondary hover:text-primary hover:bg-surface-elevated font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white font-semibold transition flex items-center gap-1.5 shadow-coral"
                  >
                    {isSavingEdit ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-muted text-xs py-6 border-t border-border">
        SynapseEvent • Coordinated Celebration Planning Atelier
      </footer>
    </div>
  );
}
