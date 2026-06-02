"use client";

/**
 * RoundSection — one knockout-round bucket of the "Etapa" board view.
 *
 * Mirrors GroupSection's collapsible chevron header, but keys off an
 * elimination round (32avos, Octavos, …) instead of a group letter, and shows
 * a blue badge with the round's points multiplier. Only rounds whose matches
 * have resolved teams reach this component (see groupMatchesByRound).
 */

import { ChevronDown, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import type { Match } from "@/features/fixtures/entities/match";
import { filterPredicate } from "@/features/predictions/entities/predictions-board";
import { cn } from "@/shared/lib/utils";
import { useReveal } from "@/shared/motion";

import { MatchCardConnected } from "./match-card-connected";
import { usePredictionsBoard } from "./predictions-provider";

export type RoundSectionProps = {
  /** Round key — used as the section anchor id. */
  round: string;
  /** Display label, e.g. "32avos". */
  label: string;
  /** Per-round points multiplier (blue badge). */
  multiplier: number;
  matches: Match[];
};

export function RoundSection({
  round,
  label,
  multiplier,
  matches,
}: RoundSectionProps) {
  const { rise, staggerContainer } = useReveal();
  const { filter, savedMap, workingMap, getLock } = usePredictionsBoard();
  const [open, setOpen] = useState(true);

  // Visible matches under the active filter. `now` is a client hint only
  // (constraint E); lock authority is Postgres.
  const now = new Date();
  const visibleMatchIds = new Set(
    matches
      .filter((m) => {
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
      })
      .map((m) => m.id),
  );

  // Hide the whole round when the filter leaves nothing to show.
  if (visibleMatchIds.size === 0 && filter !== "todos") {
    return null;
  }

  const total = matches.length;
  const bodyId = `round-body-${round}`;

  return (
    <section id={round} className="grid gap-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-2.5 rounded-xl text-left transition-colors hover:opacity-90"
      >
        <span className="grid size-[30px] place-items-center rounded-xl bg-foreground text-background">
          <Trophy aria-hidden className="size-4" />
        </span>
        <h2 className="font-heading text-[19px] font-bold tracking-tight">
          {label}
        </h2>
        <span className="inline-flex items-center rounded-pill bg-info-soft px-2 py-0.5 font-mono text-[11px] font-bold text-info-deep">
          ×{multiplier}
        </span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {total} {total === 1 ? "partido" : "partidos"}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {open ? (
        <motion.div
          id={bodyId}
          className="grid gap-3 md:grid-cols-2"
          variants={staggerContainer}
          initial={staggerContainer ? "hidden" : undefined}
          animate={staggerContainer ? "visible" : undefined}
        >
          {matches
            .filter((m) => visibleMatchIds.has(m.id))
            .map((match) => (
              <motion.div key={match.id} variants={rise}>
                <MatchCardConnected match={match} />
              </motion.div>
            ))}
        </motion.div>
      ) : null}
    </section>
  );
}
