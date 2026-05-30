"use client";

import { useState } from "react";

import { motion } from "motion/react";

import type { Match } from "@/features/fixtures/entities/match";
import type {
  PredictionError,
  PredictionInput,
} from "@/features/predictions/entities/prediction";
import { filterPredicate } from "@/features/predictions/entities/predictions-board";
import { useReveal } from "@/shared/motion";

import { MatchCard } from "./match-card";
import { usePredictionsBoard } from "./predictions-provider";

export type GroupSectionProps = {
  groupLabel: string;
  matches: Match[];
  predictionsByMatchId?: Record<string, PredictionInput | null>;
  lockedMatchIds?: Set<string>;
  errorsByMatchId?: Record<string, PredictionError | "locked" | null>;
  savingMatchIds?: Set<string>;
  onMatchChange: (matchId: string, next: PredictionInput) => void;
  onMatchSubmit?: (matchId: string) => void;
};

/** Cancha Pop ".grouplabel": badge letter + title + match-count meta. */
function GroupLabel({
  groupLabel,
  total,
  isDone,
}: {
  groupLabel: string;
  total: number;
  isDone?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid size-[30px] place-items-center rounded-xl font-heading text-[13px] font-bold text-background ${
          isDone ? "bg-primary" : "bg-foreground"
        }`}
      >
        {groupLabel}
      </span>
      <h2 className="font-heading text-[19px] font-bold tracking-tight">
        Grupo {groupLabel}
      </h2>
      <span className="ml-auto text-xs font-semibold text-muted-foreground">
        {total} {total === 1 ? "partido" : "partidos"}
      </span>
    </div>
  );
}

export function GroupSection({
  groupLabel,
  matches,
  predictionsByMatchId,
  lockedMatchIds,
  errorsByMatchId,
  savingMatchIds,
  onMatchChange,
  onMatchSubmit,
}: GroupSectionProps) {
  const { rise, staggerContainer } = useReveal();
  const totalMatches = matches.length;

  // Read group progress + filter state from context
  const { groupProgress, filter, savedMap, workingMap, getLock } =
    usePredictionsBoard();
  const gp = groupProgress.find((g) => g.label === groupLabel);
  const isDone = gp?.status === "done";

  // Derive which matches are visible under the active filter (REQ-05).
  // `now` is the client clock — a hint only (constraint E); lock authority is Postgres.
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

  // userExpanded: set to true when the user explicitly taps the "grupo completo"
  // strip to reopen the group. Resets back to false if the group is no longer done.
  const [userExpanded, setUserExpanded] = useState(false);

  // Show the collapse strip when: group is done AND user has NOT expanded it
  const showCollapsedStrip = isDone && !userExpanded;

  // If no matches are visible under the current filter, hide the entire group
  if (visibleMatchIds.size === 0 && filter !== "todos") {
    return null;
  }

  if (totalMatches === 0) {
    return (
      <section id={groupLabel} className="grid gap-3">
        <GroupLabel groupLabel={groupLabel} total={0} isDone={isDone} />
        <p className="text-sm text-muted-foreground">
          No hay partidos para mostrar.
        </p>
      </section>
    );
  }

  return (
    <section id={groupLabel} className="grid gap-3">
      <GroupLabel
        groupLabel={groupLabel}
        total={totalMatches}
        isDone={isDone}
      />

      {showCollapsedStrip ? (
        // "Grupo completo" auto-collapse strip — user taps to reopen (REQ-06)
        <button
          type="button"
          onClick={() => setUserExpanded(true)}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary/12 px-[14px] py-[11px] text-left text-[13px] font-[650] text-primary-deep transition-colors hover:bg-primary/18"
          aria-label="Grupo completo — tap para expandir"
        >
          {/* checkmark icon */}
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <circle cx="8" cy="8" r="8" className="fill-primary/20" />
            <path
              d="M4.5 8.5L7 11L11.5 5.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Grupo completo</span>
          <span className="ml-auto font-mono text-[11.5px] text-primary-deep/70">
            {gp ? `${gp.loaded}/${gp.total}` : null}
          </span>
        </button>
      ) : (
        <motion.div
          className="grid gap-3 md:grid-cols-2"
          variants={staggerContainer}
          initial={staggerContainer ? "hidden" : undefined}
          animate={staggerContainer ? "visible" : undefined}
        >
          {matches
            .filter((m) => visibleMatchIds.has(m.id))
            .map((match) => {
              const prediction = predictionsByMatchId?.[match.id] ?? null;
              const isLocked = lockedMatchIds?.has(match.id) ?? false;
              const error = errorsByMatchId?.[match.id] ?? null;
              const saving = savingMatchIds?.has(match.id) ?? false;

              return (
                <motion.div key={match.id} variants={rise}>
                  <MatchCard
                    match={match}
                    prediction={prediction}
                    isLocked={isLocked}
                    error={error}
                    saving={saving}
                    onChange={(next) => onMatchChange(match.id, next)}
                    onSubmit={
                      onMatchSubmit ? () => onMatchSubmit(match.id) : undefined
                    }
                  />
                </motion.div>
              );
            })}
        </motion.div>
      )}
    </section>
  );
}
