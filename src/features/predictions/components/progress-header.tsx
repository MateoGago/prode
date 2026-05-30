"use client";

/**
 * ProgressHeader — sticky progress banner for the predictions page.
 *
 * Reads `progress` directly from PredictionsProvider context (no prop drilling).
 * Visual language: Cancha Pop (conic-gradient ring, Bricolage Grotesque display
 * heading, oklch design tokens via Tailwind 4 CSS variables).
 *
 * cierranHoy semantics (SUGGESTION-01 carry-forward):
 *   Counts open matches whose kickoffAt falls within today's UTC calendar day.
 *   This matches deriveProgress's Slice 1 behaviour. We intentionally do NOT
 *   change that definition here (it would require updating predictions-board.ts
 *   tests — a Slice 1 concern). If "future-only within the day" behaviour is
 *   desired later, update deriveProgress + its tests in a dedicated slice.
 */

import { usePredictionsBoard } from "./predictions-provider";

export function ProgressHeader() {
  const { progress } = usePredictionsBoard();
  const { cargados, total, faltan, cierranHoy } = progress;

  const pct = total > 0 ? Math.round((cargados / total) * 100) : 0;

  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/86 py-3 backdrop-blur-md backdrop-saturate-150">
      {/* Progress row: ring + meta */}
      <div className="flex items-center gap-[13px]">
        {/* Conic-gradient ring */}
        <ProgressRing pct={pct} />

        {/* Text meta */}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16.5px] font-[750] leading-[1.1]">
            <em className="not-italic text-primary-deep">{cargados}</em>
            {" de "}
            {total}
            {" cargados"}
          </p>
          <div className="mt-[3px] flex flex-wrap items-center gap-[7px] text-[12.5px] text-muted-foreground">
            <span>
              {"Te faltan "}
              <strong className="text-foreground">{faltan}</strong>
            </span>
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
          className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.70_0.17_156)] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressRing — conic-gradient ring showing the percentage
// ---------------------------------------------------------------------------

interface ProgressRingProps {
  pct: number;
}

function ProgressRing({ pct }: ProgressRingProps) {
  return (
    // Snappier feedback once data arrives; no optimistic flip (design §2).
    <div
      className="relative grid h-[52px] w-[52px] flex-none place-items-center rounded-full transition-[background] duration-150"
      style={{
        background: `conic-gradient(var(--color-primary) ${pct}%, var(--color-muted) 0)`,
      }}
    >
      {/* Inner white circle */}
      <div className="absolute inset-[5px] rounded-full bg-card shadow-[0_1px_2px_oklch(0.24_0.03_165/0.05),0_10px_26px_-14px_oklch(0.24_0.03_165/0.28)]" />
      {/* Percentage label */}
      <span className="relative z-10 font-mono text-[14px] font-bold leading-none tracking-tight">
        {pct}
        {"%"}
      </span>
    </div>
  );
}
