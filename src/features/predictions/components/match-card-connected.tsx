"use client";

/**
 * MatchCardConnected — the container half of the container/presentational split.
 *
 * MatchCard stays PURE (props in, no domain hooks). This thin container is the
 * only place that touches usePredictionsBoard(): it derives the card state, the
 * effective prediction (working ?? saved), and the per-match error, then feeds
 * them to MatchCard. Editing flows back up through setPrediction → workingMap.
 */

import type { Match } from "@/features/fixtures/entities/match";
import { effectivePrediction } from "@/features/predictions/entities/predictions-board";

import { MatchCard } from "./match-card";
import { usePredictionsBoard } from "./predictions-provider";

export type MatchCardConnectedProps = {
  match: Match;
};

export function MatchCardConnected({ match }: MatchCardConnectedProps) {
  const { getCardState, savedMap, workingMap, setPrediction, errorsByMatchId } =
    usePredictionsBoard();

  const cardState = getCardState(match.id, match.kickoffAt);
  const prediction = effectivePrediction(
    savedMap[match.id] ?? null,
    workingMap[match.id],
  );
  const error = errorsByMatchId[match.id] ?? null;

  return (
    <MatchCard
      match={match}
      cardState={cardState}
      prediction={prediction}
      error={error}
      onChange={(next) => setPrediction(match.id, next)}
    />
  );
}
