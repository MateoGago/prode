"use client";

/**
 * BoardSections — renders the match list under the active view.
 *
 * Reads `viewMode` from PredictionsProvider and switches between the day
 * buckets ("dia") and the group buckets ("etapa"). Both grouping shapes are
 * computed server-side (pure) and passed in as props, so this component only
 * picks which one to lay out.
 */

import type {
  DayBlock,
  GroupBlock,
} from "@/features/predictions/entities/predictions-page";

import { DaySection } from "./day-section";
import { GroupSection } from "./group-section";
import { usePredictionsBoard } from "./predictions-provider";

export type BoardSectionsProps = {
  groups: GroupBlock[];
  days: DayBlock[];
};

export function BoardSections({ groups, days }: BoardSectionsProps) {
  const { viewMode } = usePredictionsBoard();

  return (
    <div className="grid gap-8 pt-4 pb-44 md:pb-28">
      {viewMode === "dia"
        ? days.map((d) => (
            <DaySection
              key={d.dateKey}
              dateKey={d.dateKey}
              day={d.day}
              weekday={d.weekday}
              month={d.month}
              matches={d.matches}
            />
          ))
        : groups.map((group) => (
            <GroupSection
              key={group.groupLabel}
              groupLabel={group.groupLabel}
              matches={group.matches}
            />
          ))}
    </div>
  );
}
