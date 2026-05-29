"use client";

import { useMemo, useState } from "react";

import type { Match } from "@/features/fixtures/entities/match";
import { savePrediction } from "@/features/predictions/actions/save-prediction";
import type {
  PredictionError,
  PredictionInput,
} from "@/features/predictions/entities/prediction";

import { GroupSection } from "./group-section";

export type GroupBlock = {
  groupLabel: string;
  matches: Match[];
};

export type PredictionsPageClientProps = {
  userId: string;
  groups: GroupBlock[];
  initialPredictionsByMatchId: Record<string, PredictionInput | null>;
};

type MatchError = PredictionError | "locked" | null;

export function PredictionsPageClient({
  userId,
  groups,
  initialPredictionsByMatchId,
}: PredictionsPageClientProps) {
  const [predictionsByMatchId, setPredictionsByMatchId] = useState<
    Record<string, PredictionInput | null>
  >(initialPredictionsByMatchId);
  const [savingMatchIds, setSavingMatchIds] = useState<Set<string>>(new Set());
  const [errorsByMatchId, setErrorsByMatchId] = useState<
    Record<string, MatchError>
  >({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const lockedMatchIds = useMemo(() => {
    const locked = new Set<string>();
    const now = Date.now();

    for (const group of groups) {
      for (const match of group.matches) {
        if (new Date(match.kickoffAt).getTime() <= now) {
          locked.add(match.id);
        }
      }
    }

    return locked;
  }, [groups]);

  function onMatchChange(matchId: string, next: PredictionInput) {
    setPredictionsByMatchId((current) => ({
      ...current,
      [matchId]: next,
    }));
    setErrorsByMatchId((current) => ({
      ...current,
      [matchId]: null,
    }));
    setGeneralError(null);
  }

  async function onMatchSubmit(matchId: string) {
    const prediction = predictionsByMatchId[matchId] ?? {
      homeScore: 0,
      awayScore: 0,
      advancerTeamId: null,
    };

    setGeneralError(null);
    setSavingMatchIds((current) => new Set(current).add(matchId));

    try {
      const result = await savePrediction({
        userId,
        matchId,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        advancerTeamId: prediction.advancerTeamId,
      });

      if (result.ok) {
        setErrorsByMatchId((current) => ({
          ...current,
          [matchId]: null,
        }));
        setGeneralError(null);
        return;
      }

      if (result.reason === "match_not_found") {
        setGeneralError(
          "No se encontró el partido. Actualizá la página e intentá nuevamente.",
        );
        return;
      }

      const matchError: PredictionError | "locked" = result.reason;

      setErrorsByMatchId((current) => ({
        ...current,
        [matchId]: matchError,
      }));
    } finally {
      setSavingMatchIds((current) => {
        const next = new Set(current);
        next.delete(matchId);
        return next;
      });
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay partidos de fase de grupos para mostrar.
      </p>
    );
  }

  return (
    <div className="grid gap-8">
      {generalError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {generalError}
        </p>
      ) : null}

      {groups.map((group) => (
        <GroupSection
          key={group.groupLabel}
          groupLabel={group.groupLabel}
          matches={group.matches}
          predictionsByMatchId={predictionsByMatchId}
          lockedMatchIds={lockedMatchIds}
          errorsByMatchId={errorsByMatchId}
          savingMatchIds={savingMatchIds}
          onMatchChange={onMatchChange}
          onMatchSubmit={onMatchSubmit}
        />
      ))}
    </div>
  );
}
