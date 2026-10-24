"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Calculator,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Heart,
  PartyPopper,
  Wine,
  Users,
  Sun,
} from "lucide-react";

export interface HeroSlide {
  id: string;
  theme: "WEDDING" | "BIRTHDAY" | "ANNIVERSARY" | "FAMILY" | "GARDEN";
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  caption: string;
  imageUrl: string;
  imageAlt: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-wedding",
    theme: "WEDDING",
    icon: Heart,
    eyebrow: "Weddings worth remembering",
    caption: "Royal floral mandaps, multi-ceremony timelines, and genuine hospitality",
    imageUrl:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Magnificent celebration with warm ambient lighting and blooming floral arches",
  },
  {
    id: "slide-birthday",
    theme: "BIRTHDAY",
    icon: PartyPopper,
    eyebrow: "Little birthdays, big memories",
    caption: "Custom cakes, lively party decor, and smiling faces across all generations",
    imageUrl:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Joyful celebration atmosphere with festive balloons and colorful accents",
  },
  {
    id: "slide-anniversary",
    theme: "ANNIVERSARY",
    icon: Wine,
    eyebrow: "Intimate moments, beautifully hosted",
    caption: "Candlelit tables, terrace fairy lights, and curated dining experiences",
    imageUrl:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Warm evening dinner celebration with ambient candlelight and elegant glassware",
  },
  {
    id: "slide-family",
    theme: "FAMILY",
    icon: Users,
    eyebrow: "Joyful family gatherings",
    caption: "Elders, cousins, and loved ones sharing laughter under one warm roof",
    imageUrl:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Lively family feast and celebratory dinner table with loved ones",
  },
  {
    id: "slide-garden",
    theme: "GARDEN",
    icon: Sun,
    eyebrow: "Celebrations made effortless",
    caption: "Open-air floral settings, relaxed hospitality, and timeless moments",
    imageUrl:
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Sunlit outdoor garden celebration with elegant pastel table styling",
  },
];

const AUTO_PLAY_INTERVAL_MS = 6000;

interface Props {
  user: { id: string; email: string; name?: string | null } | null;
}

export function CelebrationHeroShowcase({ user }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check user prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setIsPlaying(false);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  // Pause on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPlaying(false);
      } else if (!prefersReducedMotion && !isHovered) {
        setIsPlaying(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [prefersReducedMotion, isHovered]);

  // Slideshow timer
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(goToNext, AUTO_PLAY_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, prefersReducedMotion, isHovered, goToNext, activeIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNext();
    }
  };

  const currentSlide = HERO_SLIDES[activeIndex];
  const CurrentIcon = currentSlide.icon;

  return (
    <section
      ref={containerRef}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Celebration Showcase Hero"
      className="relative min-h-[calc(100vh-4.5rem)] min-h-[640px] lg:min-h-[720px] flex flex-col justify-center items-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      {/* 1. Full-Width Photographic Background Layer with Smooth Crossfade */}
      <div className="absolute inset-0 z-0 bg-aubergine-dark">
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fill
                priority={idx === 0}
                sizes="100vw"
                quality={85}
                className={`object-cover object-center transition-transform duration-[7000ms] ease-out ${
                  isActive && !prefersReducedMotion ? "scale-105" : "scale-100"
                }`}
              />
            </div>
          );
        })}

        {/* 2. Sophisticated Multi-Layer Color and Vignette Overlay */}
        {/* Layer A: Base brand-colored tint (Warm ivory in light mode, deep aubergine in dark mode) */}
        <div className="absolute inset-0 z-20 bg-page/80 dark:bg-aubergine-dark/85 backdrop-blur-[1px] transition-colors duration-500" />

        {/* Layer B: Vertical readability gradient */}
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-page/90 via-transparent to-page/95 dark:from-aubergine-dark/90 dark:via-transparent dark:to-aubergine-dark/95" />

        {/* Layer C: Radial center glow keeping typography crisp */}
        <div className="absolute inset-0 z-20 bg-radial-gradient from-page/60 via-transparent to-page/80 dark:from-aubergine/40 dark:via-transparent dark:to-aubergine-dark/80" />

        {/* Layer D: Subtle champagne and coral accent glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-champagne/15 dark:bg-plum/25 blur-[120px] rounded-full pointer-events-none z-20" />
      </div>

      {/* 3. Hero Editorial Content (Positioned Front and Center) */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center my-auto flex flex-col items-center">
        {/* Living Celebration Showcase Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/85 backdrop-blur-md border border-champagne/40 dark:border-champagne/20 shadow-subtle mb-6 transition-all duration-300">
          <CurrentIcon className="w-4 h-4 text-coral animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-primary transition-opacity duration-300">
            {currentSlide.eyebrow}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-coral/60" />
          <span className="text-[11px] font-mono text-muted hidden sm:inline">
            {activeIndex + 1}/{HERO_SLIDES.length}
          </span>
        </div>

        {/* Primary Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black text-primary tracking-tight leading-[1.08] mb-6 drop-shadow-sm">
          Plan the celebration. <br />
          <span className="italic font-normal text-coral">
            Not the chaos.
          </span>
        </h1>

        {/* Clear, Human-Centered Description */}
        <p className="text-base sm:text-xl text-primary/85 dark:text-muted max-w-2xl mx-auto leading-relaxed font-sans mb-8 drop-shadow-xs">
          From birthdays to weddings, turn your ideas, guest list, and budget into
          a celebration worth remembering — with a little help from AI.
        </p>

        {/* Calls to Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-10">
          <Link
            href={user ? "/dashboard" : "/sign-up"}
            id="hero-primary-cta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold bg-coral hover:bg-coral-hover text-white shadow-coral transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {user ? "Open Your Dashboard" : "Start Planning Free"}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#capabilities"
            id="hero-secondary-cta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold text-primary bg-surface/90 hover:bg-surface-elevated backdrop-blur-md border border-border/80 shadow-subtle transition transform hover:-translate-y-0.5"
          >
            Explore Studio Features
          </a>
        </div>

        {/* Micro Value Badges (Simple, Human Benefits) */}
        <div className="flex items-center justify-center gap-6 text-xs text-primary/80 dark:text-secondary flex-wrap pt-2">
          <span className="flex items-center gap-1.5 font-medium bg-surface/50 dark:bg-surface/30 backdrop-blur-xs px-3 py-1.5 rounded-full border border-border/40">
            <Calculator className="w-4 h-4 text-coral shrink-0" />
            A budget that stays clear
          </span>
          <span className="flex items-center gap-1.5 font-medium bg-surface/50 dark:bg-surface/30 backdrop-blur-xs px-3 py-1.5 rounded-full border border-border/40">
            <Clock className="w-4 h-4 text-coral shrink-0" />
            A plan that keeps everyone on track
          </span>
          <span className="flex items-center gap-1.5 font-medium bg-surface/50 dark:bg-surface/30 backdrop-blur-xs px-3 py-1.5 rounded-full border border-border/40">
            <Sparkles className="w-4 h-4 text-coral shrink-0" />
            Ideas made for your celebration
          </span>
        </div>
      </div>

      {/* 4. Slideshow Controls & Progress Bar */}
      <div className="relative z-30 w-full max-w-5xl mx-auto px-4 pb-6 flex items-center justify-between gap-4 mt-auto">
        {/* Caption and Active Theme Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted max-w-md truncate">
          <span className="font-semibold text-primary/90">
            {currentSlide.eyebrow}:
          </span>
          <span className="truncate italic">
            {currentSlide.caption}
          </span>
        </div>

        {/* Interactive Indicator Pills & Navigation */}
        <div className="flex items-center gap-2 mx-auto md:mx-0">
          {/* Previous Button */}
          <button
            onClick={goToPrev}
            aria-label="Previous celebration photo"
            className="p-2 rounded-xl bg-surface/80 hover:bg-surface text-primary backdrop-blur-md border border-border/80 transition-all hover:scale-105 active:scale-95 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/80 backdrop-blur-md border border-border/80">
            {HERO_SLIDES.map((slide, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${slide.eyebrow}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-7 bg-coral shadow-xs"
                      : "w-2 bg-muted/40 hover:bg-muted/70"
                  }`}
                />
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={goToNext}
            aria-label="Next celebration photo"
            className="p-2 rounded-xl bg-surface/80 hover:bg-surface text-primary backdrop-blur-md border border-border/80 transition-all hover:scale-105 active:scale-95 shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle Button */}
          {!prefersReducedMotion && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause background slideshow" : "Play background slideshow"}
              className="p-2 rounded-xl bg-surface/80 hover:bg-surface text-muted hover:text-primary backdrop-blur-md border border-border/80 transition-all shadow-xs ml-1"
              title={isPlaying ? "Pause slideshow" : "Resume slideshow"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
