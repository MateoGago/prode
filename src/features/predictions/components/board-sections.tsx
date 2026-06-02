"use client";

/**
 * BoardSections — renders the match list under the active view.
 *
 * Reads `viewMode` from PredictionsProvider and switches between the day
 * buckets ("dia") and the group buckets ("etapa"). Both grouping shapes are
 * computed server-side (pure) and passed in as props, so this component only
 * picks which one to lay out.
 */

import {
  type DayBlock,
  type GroupBlock,
  type RoundBlock,
  shouldCollapseDayByDefault,
} from "@/features/predictions/entities/predictions-page";

import { DaySection } from "./day-section";
import { GroupSection } from "./group-section";
import { usePredictionsBoard } from "./predictions-provider";
import { RoundSection } from "./round-section";

export type BoardSectionsProps = {
  groups: GroupBlock[];
  days: DayBlock[];
  rounds: RoundBlock[];
};

export function BoardSections({ groups, days, rounds }: BoardSectionsProps) {
  const { viewMode } = usePredictionsBoard();

  // Single client "now" shared across all day sections so the collapse boundary
  // (days before yesterday start collapsed) is consistent within one render.
  const now = new Date();

  return (
    <div className="grid gap-8 pt-4 pb-44 md:pb-28">
      {viewMode === "dia" ? (
        days.map((d) => (
          <DaySection
            key={d.dateKey}
            dateKey={d.dateKey}
            day={d.day}
            weekday={d.weekday}
            month={d.month}
            matches={d.matches}
            defaultCollapsed={shouldCollapseDayByDefault(d.dateKey, now)}
          />
        ))
      ) : (
        <>
          {/* Knockout rounds lead the Etapa view once their teams resolve — it's
              the current stage, and burying them under 12 group sections (72
              cards) made them unreachable. During the group stage `rounds` is
              empty, so the groups simply show on their own. */}
          {rounds.map((r) => (
            <RoundSection
              key={r.round}
              round={r.round}
              label={r.label}
              multiplier={r.multiplier}
              matches={r.matches}
            />
          ))}
          {groups.map((group) => (
            <GroupSection
              key={group.groupLabel}
              groupLabel={group.groupLabel}
              matches={group.matches}
            />
          ))}
        </>
      )}
    </div>
  );
}
