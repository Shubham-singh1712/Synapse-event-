"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertTriangle, Database, Sparkles, Heart, Settings } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDbUnprovisioned, setIsDbUnprovisioned] = useState(false);
  const [isGoogleUnconfigured, setIsGoogleUnconfigured] = useState(false);

  // Parse error query params from OAuth redirects or callback failures
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam) return;

    if (errorParam === "GOOGLE_OAUTH_UNCONFIGURED") {
      setIsGoogleUnconfigured(true);
      setErrorMsg(
        "Google sign-in is not yet configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.local file."
      );
    } else if (errorParam === "GOOGLE_AUTH_CANCELLED") {
      setErrorMsg("Google sign-in was cancelled or access was denied.");
    } else if (errorParam === "GOOGLE_AUTH_STATE_MISMATCH") {
      setErrorMsg("Security validation expired or state mismatched. Please try signing in again.");
    } else if (errorParam === "GOOGLE_AUTH_FAILED") {
      setErrorMsg("Unable to complete Google authentication. Please try again or use email sign-in.");
    } else if (errorParam === "DATABASE_UNCONFIGURED") {
      setIsDbUnprovisioned(true);
      setErrorMsg("Database persistence is in unprovisioned mode. Please configure DATABASE_URL in .env.local.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsDbUnprovisioned(false);
    setIsGoogleUnconfigured(false);

    if (!email.trim() || !password) {
      setErrorMsg("Email and password are required.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.status === 503 && data.error === "DATABASE_UNCONFIGURED") {
        setIsDbUnprovisioned(true);
        setErrorMsg(data.message);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.message || "Invalid credentials.");
        return;
      }

      // Success: redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full py-10 space-y-7">
      {/* Header branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-champagne/15 border border-champagne/30 text-[11px] font-semibold text-secondary tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-coral" />
          <span>Celebration Planning Atelier</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-primary tracking-tight">
          Welcome Back
        </h1>
        <p className="text-sm text-muted">
          Access your curated celebrations, budgets, and collaborative workspaces.
        </p>
      </div>

      {/* Google OAuth Configuration Notice */}
      {isGoogleUnconfigured && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
            <Settings className="w-4 h-4 shrink-0" />
            <span>Google OAuth Setup Required</span>
          </div>
          <p className="text-secondary leading-relaxed">
            Google OAuth credentials are not yet configured. To enable live Google sign-in, add{" "}
            <code className="text-amber-700 dark:text-amber-300 bg-surface px-1.5 py-0.5 rounded border border-border">
              GOOGLE_CLIENT_ID
            </code>{" "}
            and{" "}
            <code className="text-amber-700 dark:text-amber-300 bg-surface px-1.5 py-0.5 rounded border border-border">
              GOOGLE_CLIENT_SECRET
            </code>{" "}
            in your <code className="text-amber-700 dark:text-amber-300 bg-surface px-1.5 py-0.5 rounded border border-border">.env.local</code>.
          </p>
        </div>
      )}

      {/* Database Unprovisioned Notice */}
      {isDbUnprovisioned && !isGoogleUnconfigured && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
            <Database className="w-4 h-4 shrink-0" />
            <span>Database Persistence Unprovisioned</span>
          </div>
          <p className="text-secondary leading-relaxed">
            Managed PostgreSQL is not connected. User account authentication requires configuring{" "}
            <code className="text-amber-700 dark:text-amber-300 bg-surface px-1.5 py-0.5 rounded border border-border">
              DATABASE_URL
            </code>{" "}
            in{" "}
            <code className="text-amber-700 dark:text-amber-300 bg-surface px-1.5 py-0.5 rounded border border-border">
              .env.local
            </code>.
          </p>
        </div>
      )}

      {/* General Error message */}
      {errorMsg && !isDbUnprovisioned && !isGoogleUnconfigured && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-600 dark:text-red-300 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-soft transition-colors">
        {/* 1. Google OAuth Option */}
        <div className="space-y-4">
          <GoogleSignInButton text="Continue with Google" />

          {/* Visual Divider */}
          <div className="relative flex items-center justify-center my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-surface px-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
              OR CONTINUE WITH EMAIL
            </span>
          </div>
        </div>

        {/* 2. Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="curator@synapse-event.com"
              required
              className="w-full bg-page border border-border rounded-xl px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-secondary" htmlFor="password">
                Password
              </label>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-page border border-border rounded-xl px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/60 focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral transition"
            />
          </div>

          <button
            type="submit"
            id="sign-in-submit-btn"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-coral hover:bg-coral-hover disabled:opacity-50 text-white font-semibold text-sm shadow-coral transition flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In with Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-coral hover:underline font-semibold">
              Create an Account
            </Link>
          </p>
        </form>
      </div>

      {/* Subtle reassurance */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        <Heart className="w-3.5 h-3.5 text-coral/70" />
        <span>Curated planning for weddings, milestones & galas</span>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-page text-primary flex flex-col justify-between p-4 sm:p-8 transition-colors">
      {/* Top Bar with brand & theme toggle */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="SynapseEvent Home">
          <div className="w-9 h-9 rounded-xl bg-coral flex items-center justify-center text-white font-serif font-black shadow-sm group-hover:scale-105 transition">
            S
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-primary">
            Synapse<span className="text-coral">Event</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <Suspense fallback={<div className="max-w-md mx-auto w-full py-10 text-center text-muted text-sm">Loading sign-in...</div>}>
        <SignInContent />
      </Suspense>

      <footer className="text-center text-muted text-xs py-4 border-t border-border">
        SynapseEvent • Coordinated Celebration Architecture
      </footer>
    </div>
  );
}
