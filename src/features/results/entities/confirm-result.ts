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

export interface ScorablePrediction {
  id: string;
  homeScore: number;
  awayScore: number;
}

export interface ResultInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancerTeamId: string | null;
}

export interface ResultMatchContext {
  round: Round;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

export type ResultError =
  | "negative_score"
  | "non_integer_score"
  | "advancer_required"
  | "advancer_not_competing"
  | "advancer_not_allowed";

export type ResultValidation =
  | { ok: true }
  | { ok: false; reason: ResultError };

/**
 * Server-side validation of an admin-entered final score — the form is cosmetic
 * (REQ-XCUT-5). Unlike predictions, a knockout draw MUST record the ET/penalty
 * winner (REQ-RES-3), a knockout non-draw may omit it, and a group match has none.
 */
export function validateResultInput(
  input: ResultInput,
  match: ResultMatchContext,
): ResultValidation {
  const { homeScore, awayScore, advancerTeamId } = input;

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    return { ok: false, reason: "non_integer_score" };
  }
  if (homeScore < 0 || awayScore < 0) {
    return { ok: false, reason: "negative_score" };
  }

  if (match.round === "group") {
    if (advancerTeamId !== null) {
      return { ok: false, reason: "advancer_not_allowed" };
    }
    return { ok: true };
  }

  const isDraw = homeScore === awayScore;
  if (isDraw && advancerTeamId === null) {
    return { ok: false, reason: "advancer_required" };
  }
  if (
    advancerTeamId !== null &&
    advancerTeamId !== match.homeTeamId &&
    advancerTeamId !== match.awayTeamId
  ) {
    return { ok: false, reason: "advancer_not_competing" };
  }
  return { ok: true };
}

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
