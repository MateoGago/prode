/**
 * Confirm-result use-case — pure recomputation core (REQ-RES-4, REQ-RES-8).
 * No infra imports; the action layer does the Supabase I/O around this.
 */

import type { Round } from "@/features/fixtures/entities/match";
import { calculatePoints } from "@/features/scoring/entities/scoring";

/** A confirmed final score for a match — the 120' score for knockouts. */
export interface ConfirmedResult {
  matchId: string;
  round: Round;
  homeScore: number;
  awayScore: number;
  /** Penalty/draw advancer; persisted but never affects points (REQ-KO-3). */
  advancerTeamId: string | null;
}

/** A prediction to (re)score: its id plus the user's predicted scoreline. */
export interface ScorablePrediction {
  id: string;
  homeScore: number;
  awayScore: number;
}

/** The points to persist for one prediction after recomputation. */
export interface ScoredPrediction {
  id: string;
  pointsAwarded: number;
}

/**
 * Recompute points for EVERY prediction of a match against the confirmed
 * result. Pure and idempotent: each value is computed absolutely (never
 * incremented), so re-running it — or re-confirming a corrected result —
 * cannot double-credit or corrupt points (SCORE-11, RES-4).
 */
export function scorePredictions(
  predictions: ScorablePrediction[],
  result: ConfirmedResult,
): ScoredPrediction[] {
  return predictions.map((prediction) => ({
    id: prediction.id,
    pointsAwarded: calculatePoints(
      { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
      { homeScore: result.homeScore, awayScore: result.awayScore },
      result.round,
    ),
  }));
}
