"use client";

import { useReducedMotion } from "motion/react";

import { rise, staggerContainer } from "./presets";

/**
 * Reveal variants that collapse to a no-op when the user prefers reduced motion.
 * Returning the variants (instead of forcing them in a wrapper) keeps callers in
 * control of `initial`/`animate` while honoring the OS accessibility setting.
 */
export function useReveal() {
  const reduced = useReducedMotion();

  if (reduced) {
    return { rise: undefined, staggerContainer: undefined } as const;
  }

  return { rise, staggerContainer } as const;
}
