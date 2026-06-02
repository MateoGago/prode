"use client";

/**
 * ProgressHeader — sticky progress banner for the predictions page.
 *
 * Reads `progress` directly from PredictionsProvider context (no prop drilling).
 * Visual language: Cancha Pop (Bricolage Grotesque display heading, oklch design
 * tokens via Tailwind 4 CSS variables).
 *
 * Stuck detection: a zero-height sentinel is placed immediately before the sticky
 * element. An IntersectionObserver watches it; when it scrolls out of the top of
 * the viewport the header is "stuck" and we apply the surface classes
 * (bg/blur/saturate/border). While the sentinel is still visible the header is
 * transparent so it doesn't paint over in-flow content.
 *
 * SSR guard: IntersectionObserver is not available in Node (SSR). The useEffect
 * only runs on the client, so the observer is created client-side only. The
 * initial `isStuck` state is false (transparent), which is correct for SSR/hydration
 * since the page starts un-scrolled.
 *
 * cierranHoy semantics (SUGGESTION-01 carry-forward):
 *   Counts open matches whose kickoffAt falls within today's UTC calendar day.
 *   This matches deriveProgress's Slice 1 behaviour. We intentionally do NOT
 *   change that definition here (it would require updating predictions-board.ts
 *   tests — a Slice 1 concern). If "future-only within the day" behaviour is
 *   desired later, update deriveProgress + its tests in a dedicated slice.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { usePredictionsBoard } from "./predictions-provider";

export function ProgressHeader() {
  const { progress } = usePredictionsBoard();
  const { cargados, total, faltan, cierranHoy } = progress;

  const pct = total > 0 ? Math.round((cargados / total) * 100) : 0;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // sentinel not intersecting → scrolled past top → header is stuck
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Zero-height sentinel placed BEFORE the sticky element.
          When this scrolls out of the viewport (top), the observer fires
          and we know the header is pinned. */}
      <div ref={sentinelRef} aria-hidden className="h-0" />

      {/*
        Full-bleed band: the sticky background spans the entire content column
        instead of stopping at container-app's 1100px max-width, so when pinned
        it reaches the column edges rather than leaving the page background in the
        gutters. The column starts at the desktop sidebar (w-60 = 15rem); on
        mobile the sidebar is hidden, so it spans the whole viewport. Inner
        content is re-constrained to container-app to stay aligned with the page.
      */}
      <div
        className={cn(
          "sticky top-0 z-30 ml-[calc(50%-50vw)] w-screen py-3 md:ml-[calc(50%-50vw+7.5rem)] md:w-[calc(100vw-15rem)]",
          "transition-colors duration-200",
          isStuck &&
            "border-b border-border/60 bg-background/86 backdrop-blur-md backdrop-saturate-150",
        )}
      >
        <div className="container-app">
          {/* Text meta */}
          <div className="min-w-0">
            <p className="font-display text-[16.5px] font-[750] leading-[1.1]">
              <em className="not-italic text-primary-deep">{cargados}</em>
              {" de "}
              {total}
              {" cargados"}
            </p>
            <div className="mt-[3px] flex flex-wrap items-center gap-[7px] text-[12.5px] text-muted-foreground">
              {faltan > 0 ? (
                <span>
                  {"Te faltan "}
                  <strong className="text-foreground">{faltan}</strong>
                </span>
              ) : (
                // Nothing left you can still load (the rest is locked/closed).
                <span className="font-semibold text-primary-deep">
                  Estás al día
                </span>
              )}
              {cierranHoy > 0 && (
                <span className="inline-flex items-center gap-[5px] font-bold text-warn-deep">
                  {"·"}
                  <span
                    aria-hidden="true"
                    className="inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-warn"
                  />
                  {cierranHoy}
                  {" cierran hoy"}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso: ${pct}% cargado`}
            className="mt-[11px] h-2 overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_oklch(0.24_0.03_165/0.08)]"
          >
            {/* Snappier feedback once data arrives; no optimistic flip (design §2). */}
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-[oklch(0.70_0.17_156)] transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
