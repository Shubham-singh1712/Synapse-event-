"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
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
  // Track rendered slide images to prevent concurrent network bandwidth contention on initial page load
  // Slide 0 is preloaded immediately for optimal LCP; subsequent slides are deferred and loaded on demand.
  const [renderedIndices, setRenderedIndices] = useState<number[]>([0]);

  useEffect(() => {
    const nextIdx = (activeIndex + 1) % HERO_SLIDES.length;
    setRenderedIndices((prev) => {
      if (prev.includes(activeIndex) && prev.includes(nextIdx)) return prev;
      const set = new Set(prev);
      set.add(activeIndex);
      set.add(nextIdx);
      return Array.from(set);
    });
  }, [activeIndex]);

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
      className="relative min-h-[calc(100vh-74px)] sm:min-h-[calc(100svh-74px)] flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-coral bg-[#140816] px-4 sm:px-6 py-10 sm:py-12"
    >
      {/* 1. Full-Width Photographic Background Layer with Smooth Crossfade */}
      <div className="absolute inset-0 z-0 bg-[#140816]">
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
              {(idx === 0 || isActive || renderedIndices.includes(idx)) && (
                <Image
                  src={slide.imageUrl}
                  alt={slide.imageAlt}
                  fill
                  priority={idx === 0}
                  loading={idx === 0 ? "eager" : "lazy"}
                  sizes="100vw"
                  className={`object-cover object-center brightness-[0.92] contrast-[1.05] transition-transform duration-[8000ms] ease-out ${
                    isActive && !prefersReducedMotion ? "scale-105" : "scale-100"
                  }`}
                />
              )}
            </div>
          );
        })}

        {/* 2. Balanced Visual Contrast Scrim — Keeps photography rich and vibrant while preserving 100% text clarity */}
        {/* Layer A: Subtle overall tint (30%), letting 70% of the photograph's light, colors, and textures shine through */}
        <div className="absolute inset-0 z-20 bg-[#160a18]/30" />

        {/* Layer B: Gentle edge vignette (darker at top/bottom to frame navbar and benefits, clear in the middle) */}
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#130716]/65 via-transparent to-[#130716]/80" />

        {/* Layer C: Soft radial contrast pocket directly behind content so text stays readable without darkening the entire photo */}
        <div className="absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,_rgba(19,7,22,0.5)_0%,_rgba(19,7,22,0.2)_55%,_transparent_80%)] pointer-events-none" />
      </div>

      {/* 3. Hero Editorial Content (Unified, Perfectly Centered Content Group) */}
      <div className="relative z-30 max-w-4xl mx-auto text-center flex flex-col items-center">
        {/* Compact, Refined Celebration Theme Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/20 shadow-md mb-4 sm:mb-5 transition-all duration-300">
          <CurrentIcon className="w-3.5 h-3.5 text-[#FF7A60] animate-pulse" />
          <span className="text-xs font-medium tracking-wide text-white transition-opacity duration-300 drop-shadow-sm">
            {currentSlide.eyebrow}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#FF7A60]" />
          <span className="text-[11px] font-mono text-white/80">
            {activeIndex + 1}/{HERO_SLIDES.length}
          </span>
        </div>

        {/* Primary Editorial Headline — High Contrast Ivory / Coral with Dedicated Text Shadow */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] font-serif font-black text-white tracking-tight leading-[1.12] mb-3 sm:mb-5 [text-shadow:_0_2px_16px_rgba(0,0,0,0.85),_0_1px_3px_rgba(0,0,0,0.9)]">
          Plan the celebration.{" "}
          <span className="block sm:inline font-normal italic text-[#FF7A60] [text-shadow:_0_2px_16px_rgba(0,0,0,0.85),_0_1px_3px_rgba(0,0,0,0.9)]">
            Not the chaos.
          </span>
        </h1>

        {/* Clear, Human-Centered Description within Sensible Max-Width */}
        <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-xl sm:max-w-2xl mx-auto leading-relaxed font-sans mb-6 sm:mb-8 [text-shadow:_0_1px_10px_rgba(0,0,0,0.9)]">
          From birthdays to weddings, turn your ideas, guest list, and budget into
          a celebration worth remembering — with a little help from AI.
        </p>

        {/* Calls to Action: One Prominent Primary CTA + One Restrained Secondary Link */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Link
            href={user ? "/dashboard" : "/sign-up"}
            id="hero-primary-cta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-sm font-bold bg-coral hover:bg-coral-hover text-white shadow-xl shadow-black/40 hover:shadow-black/60 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {user ? "Open Your Dashboard" : "Start Planning Free"}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#benefits"
            id="hero-secondary-cta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white/90 hover:text-white bg-black/30 hover:bg-black/45 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl transition-all duration-200 group shadow-md"
          >
            <span>Explore Features</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FF7A60] group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* 4. Minimal Discreet Slideshow Indicators (Positioned Absolutely at Bottom) */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 shadow-sm">
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}: ${slide.eyebrow}`}
                className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                  isActive
                    ? "w-6 bg-[#FF7A60] shadow-xs"
                    : "w-1.5 bg-white/40 hover:bg-white/80"
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
