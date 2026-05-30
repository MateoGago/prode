"use client";

import type { PredictionInput } from "@/features/predictions/entities/prediction";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";

import { BatchBar } from "./batch-bar";
import { FilterSegment } from "./filter-segment";
import { FilteredGroupsOrEmpty } from "./filtered-groups-or-empty";
import { GroupNav } from "./group-nav";
import { GroupSection } from "./group-section";
import { PredictionsProvider } from "./predictions-provider";
import { ProgressHeader } from "./progress-header";

export type PredictionsPageClientProps = {
  groups: GroupBlock[];
  initialPredictionsByMatchId: Record<string, PredictionInput>;
};

export function PredictionsPageClient({
  groups,
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

      {/* Group nav chips + segmented filter — Slice 3 */}
      <GroupNav />
      <FilterSegment />

      <FilteredGroupsOrEmpty>
        {/* pb clears the fixed BatchBar so the last cards aren't hidden behind it */}
        <div className="grid gap-8 px-[18px] pt-4 pb-44 md:pb-28">
          {groups.map((group) => (
            <GroupSection
              key={group.groupLabel}
              groupLabel={group.groupLabel}
              matches={group.matches}
            />
          ))}
        </div>
      </FilteredGroupsOrEmpty>

      {/* Sibling of the scroll content (constraint A): fixed, never inside it. */}
      <BatchBar />
    </PredictionsProvider>
  );
}
