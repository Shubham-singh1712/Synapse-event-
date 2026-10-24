"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-btn"
      type="button"
      className={`w-9 h-9 rounded-xl transition-colors flex items-center justify-center text-muted hover:text-primary hover:bg-surface-elevated border border-transparent hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${className}`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-champagne" />
      ) : (
        <Moon className="w-4 h-4 text-plum dark:text-champagne" />
      )}
    </button>
  );
}
