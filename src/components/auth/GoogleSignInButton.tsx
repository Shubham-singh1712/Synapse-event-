"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  className?: string;
  disabled?: boolean;
  text?: string;
  returnUrl?: string;
}

/**
 * Authentic Multi-Color Google "G" Brand Mark SVG
 * Complies with official Google Identity & Brand guidelines.
 */
export function GoogleIcon({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  className = "",
  disabled = false,
  text = "Continue with Google",
  returnUrl,
}: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isRedirecting) {
      e.preventDefault();
      return;
    }
    setIsRedirecting(true);
    const target = returnUrl
      ? `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
      : "/api/auth/google";
    window.location.href = target;
  };

  return (
    <button
      type="button"
      id="google-sign-in-btn"
      onClick={handleClick}
      disabled={disabled || isRedirecting}
      className={`w-full h-12 px-4 rounded-xl font-semibold text-sm transition-all duration-200
        flex items-center justify-center gap-3
        bg-surface text-primary border border-border
        hover:bg-surface-elevated hover:border-border/80 hover:shadow-soft
        active:scale-[0.99]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-sm ${className}`}
      aria-label={text}
    >
      {isRedirecting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-coral" />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <GoogleIcon />
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
