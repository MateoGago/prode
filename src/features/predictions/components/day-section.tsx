"use client";

/**
 * DaySection — one calendar-day bucket of the "Día" board view.
 *
 * Mirrors GroupSection's structure (header + filtered card grid + reveal
 * motion) but keys off an AR-local date instead of a group. There is no
 * "grupo completo" auto-collapse here — that is a group-stage concept, not a
 * day one. The active filter (Todos / Pendientes / …) still applies, and a day
 * with no visible matches under the filter is hidden entirely.
 */

import { motion } from "motion/react";

import type { Match } from "@/features/fixtures/entities/match";
import { filterPredicate } from "@/features/predictions/entities/predictions-board";
import { useReveal } from "@/shared/motion";

import { MatchCardConnected } from "./match-card-connected";
import { usePredictionsBoard } from "./predictions-provider";

export type DaySectionProps = {
  /** AR-local "YYYY-MM-DD" — anchor id + key. */
  dateKey: string;
  /** Day of month, unpadded (badge). */
  day: string;
  /** Capitalized AR weekday (e.g. "Jueves"). */
  weekday: string;
  /** Capitalized AR month (e.g. "Junio"). */
  month: string;
  matches: Match[];
};

/** Day header: numeric badge + "Weekday · Month" title + match-count meta. */
function DayLabel({
  day,
  weekday,
  month,
  total,
}: {
  day: string;
  weekday: string;
  month: string;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-[30px] place-items-center rounded-xl bg-foreground font-heading text-[13px] font-bold text-background">
        {day}
      </span>
      <h2 className="font-heading text-[19px] font-bold tracking-tight">
        {weekday} <span className="text-muted-foreground">· {month}</span>
      </h2>
      <span className="ml-auto text-xs font-semibold text-muted-foreground">
        {total} {total === 1 ? "partido" : "partidos"}
      </span>
    </div>
  );
}

export function DaySection({
  dateKey,
  day,
  weekday,
  month,
  matches,
}: DaySectionProps) {
  const { rise, staggerContainer } = useReveal();
  const { filter, savedMap, workingMap, getLock } = usePredictionsBoard();

  // Visible matches under the active filter (REQ-05). `now` is a client hint
  // only (constraint E); lock authority is Postgres.
  const now = new Date();
  const visibleMatches = matches.filter((m) => {
    const lock = getLock(m.id, m.kickoffAt);
    return filterPredicate(
      filter,
      m.id,
      savedMap,
      workingMap,
      lock,
      m.kickoffAt,
      now,
    );
  });

  // Hide the whole day when the filter leaves nothing to show.
  if (visibleMatches.length === 0 && filter !== "todos") {
    return null;
  }

  return (
    <section id={dateKey} className="grid gap-3">
      <DayLabel
        day={day}
        weekday={weekday}
        month={month}
        total={matches.length}
      />

      <motion.div
        className="grid gap-3 md:grid-cols-2"
        variants={staggerContainer}
        initial={staggerContainer ? "hidden" : undefined}
        animate={staggerContainer ? "visible" : undefined}
      >
        {visibleMatches.map((match) => (
          <motion.div key={match.id} variants={rise}>
            <MatchCardConnected match={match} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
