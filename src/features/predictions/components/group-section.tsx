"use client";

import type { Match } from "@/features/fixtures/entities/match";
import type {
  PredictionError,
  PredictionInput,
} from "@/features/predictions/entities/prediction";

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
  const totalMatches = matches.length;

  if (matches.length === 0) {
    return (
      <section className="grid gap-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Grupo {groupLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          No hay partidos para mostrar.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Grupo {groupLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          {totalMatches} {totalMatches === 1 ? "partido" : "partidos"}
        </p>
      </div>

      <div className="grid gap-3">
        {matches.map((match) => {
          const prediction = predictionsByMatchId?.[match.id] ?? null;
          const isLocked = lockedMatchIds?.has(match.id) ?? false;
          const error = errorsByMatchId?.[match.id] ?? null;
          const saving = savingMatchIds?.has(match.id) ?? false;

          return (
            <MatchCard
              key={match.id}
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
          );
        })}
      </div>
    </section>
  );
}
