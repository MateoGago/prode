"use client";

import { motion } from "motion/react";

import type { Match } from "@/features/fixtures/entities/match";
import type {
  PredictionError,
  PredictionInput,
} from "@/features/predictions/entities/prediction";
import { useReveal } from "@/shared/motion";

import { MatchCard } from "./match-card";

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
}: {
  groupLabel: string;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-[30px] place-items-center rounded-xl bg-foreground font-heading text-[13px] font-bold text-background">
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

  if (totalMatches === 0) {
    return (
      <section className="grid gap-3">
        <GroupLabel groupLabel={groupLabel} total={0} />
        <p className="text-sm text-muted-foreground">
          No hay partidos para mostrar.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      <GroupLabel groupLabel={groupLabel} total={totalMatches} />

      <motion.div
        className="grid gap-3 md:grid-cols-2"
        variants={staggerContainer}
        initial={staggerContainer ? "hidden" : undefined}
        animate={staggerContainer ? "visible" : undefined}
      >
        {matches.map((match) => {
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
    </section>
  );
}
