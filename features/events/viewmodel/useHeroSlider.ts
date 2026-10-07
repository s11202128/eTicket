"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HERO_SLIDE_LIMIT, selectHeroSlides, type HeroCandidate } from "@/features/events/model/heroSlides";

export const AUTO_ADVANCE_MS = 5000;
const CLOCK_TICK_MS = 60_000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Slider state for the homepage hero.
 * - Re-selects slides every minute, so an event drops out once it starts.
 * - Auto-advances every 5 seconds and loops, but pauses while the pointer or
 *   keyboard focus is inside, while the tab is hidden, when the visitor
 *   presses Pause, or when they prefer reduced motion.
 */
export function useHeroSlider<T extends HeroCandidate>(candidates: readonly T[], renderedAt: string) {
  // Start from the server's clock so the first client render matches the HTML.
  const [now, setNow] = useState(() => new Date(renderedAt));
  const [index, setIndex] = useState(0);
  // "auto": play unless the visitor prefers reduced motion; otherwise their explicit choice.
  const [playChoice, setPlayChoice] = useState<"auto" | "playing" | "paused">("auto");
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const slides = useMemo(() => selectHeroSlides(candidates, now, HERO_SLIDE_LIMIT), [candidates, now]);
  const count = slides.length;
  const current = count === 0 ? 0 : Math.min(index, count - 1);

  // Switch to the browser's clock right after hydration, then refresh every minute.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, CLOCK_TICK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => setIsTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (count === 0) return;
      setIndex(((target % count) + count) % count);
    },
    [count]
  );
  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const previous = useCallback(() => goTo(current - 1), [goTo, current]);

  const isPlaying = playChoice === "playing" || (playChoice === "auto" && !reducedMotion);
  const isAutoAdvancing = isPlaying && !isHovered && !hasFocus && !isTabHidden && count > 1;

  useEffect(() => {
    if (!isAutoAdvancing) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % count), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [isAutoAdvancing, current, count]);

  return {
    slides,
    current,
    count,
    goTo,
    next,
    previous,
    // Reduced-motion visitors start paused; the button lets them opt in.
    isPlaying,
    isAutoAdvancing,
    reducedMotion,
    togglePlay: () => setPlayChoice(isPlaying ? "paused" : "playing"),
    setIsHovered,
    setHasFocus,
  };
}
