"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { AuthenticatedUser } from "@/lib/auth/auth-service";

interface PublicNavbarProps {
  user: AuthenticatedUser | null;
}

export default function PublicNavbar({ user }: PublicNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { label: "Event Types", href: "/#event-types" },
    { label: "Capabilities", href: "/#capabilities" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Studio Preview", href: "/#preview" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#1A1320]/95 backdrop-blur-xl border-b border-border/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[74px] flex items-center justify-between">
        {/* Brand: Minimal Iconic Logo Mark (No redundant written text) */}
        <Link
          href="/"
          className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-xl p-1 -ml-1 transition-transform"
          aria-label="SynapseEvent Home"
        >
          <div className="w-10 h-10 rounded-xl bg-coral flex items-center justify-center text-white font-serif font-black text-xl shadow-sm group-hover:scale-105 group-hover:shadow-coral transition-all shrink-0">
            S
          </div>
          <span className="sr-only">SynapseEvent</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-secondary"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-md"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions & Theme Toggle */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                id="header-dashboard-cta"
                className="h-10 sm:h-11 px-4 sm:px-5 inline-flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold bg-coral hover:bg-coral-hover text-white shadow-coral transition-all transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coral"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="w-px h-5 bg-border mx-1" aria-hidden="true" />
              <ThemeToggle />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                id="header-sign-in-link"
                className="px-3.5 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-surface-elevated rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                id="header-get-started-cta"
                className="h-10 sm:h-11 px-4 sm:px-5 inline-flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-semibold bg-coral hover:bg-coral-hover text-white shadow-coral transition-all transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coral"
              >
                <span>Start Planning</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="w-px h-5 bg-border mx-1" aria-hidden="true" />
              <ThemeToggle />
            </div>
          )}
        </div>

        {/* Mobile Header Controls: Theme toggle + Hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            id="mobile-menu-toggle-btn"
            type="button"
            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-elevated border border-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-coral" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Tablet Hamburger (shown on md:hidden when sm:flex is active) */}
        <div className="hidden sm:flex md:hidden items-center ml-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            id="tablet-menu-toggle-btn"
            type="button"
            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-elevated border border-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-coral" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accessible Responsive Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          className="md:hidden border-b border-border bg-surface/98 backdrop-blur-xl px-4 py-6 shadow-xl space-y-5 animate-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          {/* Mobile Navigation Links */}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-base font-medium text-secondary hover:text-coral hover:bg-surface-elevated transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile Auth Actions */}
          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-coral hover:bg-coral-hover text-white shadow-coral transition"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 text-center text-sm font-medium text-secondary hover:text-primary hover:bg-surface-elevated border border-border rounded-xl transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-coral hover:bg-coral-hover text-white shadow-coral transition"
                >
                  <span>Start Planning</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
