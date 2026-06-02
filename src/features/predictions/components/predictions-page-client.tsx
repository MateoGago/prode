"use client";

import type { PredictionInput } from "@/features/predictions/entities/prediction";
import type {
  DayBlock,
  GroupBlock,
  RoundBlock,
} from "@/features/predictions/entities/predictions-page";

import { BatchBar } from "./batch-bar";
import { BoardSections } from "./board-sections";
import { FilterSegment } from "./filter-segment";
import { FilteredGroupsOrEmpty } from "./filtered-groups-or-empty";
import { BoardGroupNav } from "./group-nav";
import { PredictionsProvider } from "./predictions-provider";
import { ProgressHeader } from "./progress-header";
import { ViewModeToggle } from "./view-mode-toggle";

export type PredictionsPageClientProps = {
  groups: GroupBlock[];
  days: DayBlock[];
  rounds: RoundBlock[];
  initialPredictionsByMatchId: Record<string, PredictionInput>;
};

export function PredictionsPageClient({
  groups,
  days,
  rounds,
  initialPredictionsByMatchId,
}: PredictionsPageClientProps) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay partidos de fase de grupos para mostrar.
      </p>
    );
  }

  return (
    <PredictionsProvider
      initialPredictions={initialPredictionsByMatchId}
      groups={groups}
    >
      <ProgressHeader />

      {/* View switch (Día/Etapa) — right-aligned above the filter row. */}
      <div className="flex items-center justify-between gap-3 pt-3">
        <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Ver por
        </span>
        <ViewModeToggle />
      </div>

      {/* Group nav chips (Etapa only) + segmented filter — Slice 3 */}
      <BoardGroupNav />
      <FilterSegment />

      <FilteredGroupsOrEmpty>
        {/* BoardSections owns the bottom padding that clears the fixed BatchBar. */}
        <BoardSections groups={groups} days={days} rounds={rounds} />
      </FilteredGroupsOrEmpty>

      {/* Sibling of the scroll content (constraint A): fixed, never inside it. */}
      <BatchBar />
    </PredictionsProvider>
  );
}
