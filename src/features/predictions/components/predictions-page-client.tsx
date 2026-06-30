"use client";

import { useEffect } from "react";

import type { PredictionInput } from "@/features/predictions/entities/prediction";
import {
  type DayBlock,
  type GroupBlock,
  type RoundBlock,
  selectNextScheduledMatch,
} from "@/features/predictions/entities/predictions-page";
import { arDayParts } from "@/shared/datetime";

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

  // On load, land on the next still-playable match's day (Día is the default
  // view) so the user doesn't scroll past finished group days to reach the
  // current stage (e.g. the Round of 32). null → no scroll (nothing pending).
  // `days` buckets every rendered match (group + resolved knockout), so its
  // flattened list doubles as the provider's full lock/state source.
  const boardMatches = days.flatMap((d) => d.matches);
  const nextMatch = selectNextScheduledMatch(boardMatches);
  const scrollAnchor = nextMatch ? arDayParts(nextMatch.kickoffAt).key : null;

  return (
    <PredictionsProvider
      initialPredictions={initialPredictionsByMatchId}
      groups={groups}
      boardMatches={boardMatches}
    >
      <ScrollToAnchorOnLoad anchor={scrollAnchor} />
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

/**
 * On mount, scrolls the matching section anchor into view (once). Used to land
 * the user on the next playable match's day instead of the top of a finished
 * group stage. Renders nothing.
 */
function ScrollToAnchorOnLoad({ anchor }: { anchor: string | null }) {
  useEffect(() => {
    if (!anchor) return;
    // Wait a frame so the section is in the DOM before scrolling.
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(anchor)
        ?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
  }, [anchor]);

  return null;
}
