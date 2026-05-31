"use client";

/**
 * ViewModeToggle — segmented control that switches the board between the
 * "Día" (group by AR-local date) and "Etapa" (group by group A–L) views.
 *
 * Reads `viewMode` / `setViewMode` from PredictionsProvider context. Visual
 * language matches FilterSegment's `.seg` pills (Cancha Pop tokens): the active
 * segment is filled foreground-on-background, inactive is a muted inset pill.
 */

import type { ViewMode } from "@/features/predictions/components/predictions-provider";
import { cn } from "@/shared/lib/utils";

import { usePredictionsBoard } from "./predictions-provider";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = usePredictionsBoard();

  return (
    <div
      role="toolbar"
      aria-label="Agrupar partidos por"
      className="inline-flex flex-none items-center gap-[3px] rounded-full bg-muted p-[3px]"
    >
      <ViewModeSegment
        label="Día"
        mode="dia"
        active={viewMode === "dia"}
        onSelect={() => setViewMode("dia")}
      />
      <ViewModeSegment
        label="Etapa"
        mode="etapa"
        active={viewMode === "etapa"}
        onSelect={() => setViewMode("etapa")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewModeSegment — individual segment button
// ---------------------------------------------------------------------------

interface ViewModeSegmentProps {
  label: string;
  mode: ViewMode;
  active: boolean;
  onSelect: () => void;
}

function ViewModeSegment({ label, active, onSelect }: ViewModeSegmentProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-active={active}
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center rounded-full border-0 px-[15px] py-[7px] font-sans text-[13px] font-[650] transition-all duration-[180ms]",
        active
          ? "bg-background text-foreground shadow-[0_1px_2px_oklch(0.24_0.03_165/0.12)]"
          : "bg-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
