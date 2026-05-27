/**
 * Prediction domain: types + pure rules. No infra/framework imports (REQ-XCUT-1).
 *
 * These run client-side for instant feedback, but they are COSMETIC: the
 * authoritative lock + ownership live in Postgres RLS (REQ-XCUT-5). The same
 * rules are mirrored here so the UI and the save action can reject obviously
 * invalid input before hitting the DB.
 */

import type { Round } from "@/features/fixtures/entities/match";

/** A user's prediction for a single match. */
export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  /** Set only on a knockout draw; must be one of the two competing teams. */
  advancerTeamId: string | null;
  /** Denormalized points from the scoring engine; 0 until the result is confirmed. */
  pointsAwarded: number;
  scoredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The shape a user submits when predicting. */
export interface PredictionInput {
  homeScore: number;
  awayScore: number;
  advancerTeamId: string | null;
}

/** A prediction submission tied to its author and match. */
export interface UpsertPredictionInput extends PredictionInput {
  userId: string;
  matchId: string;
}

/** Just enough of a match to validate a prediction against it. */
export interface MatchContext {
  round: Round;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

/** Match context plus the authoritative kickoff (from the DB, never the client). */
export interface MatchKickoffContext extends MatchContext {
  kickoffAt: Date;
}

export type PredictionError =
  | "negative_score"
  | "non_integer_score"
  | "advancer_required"
  | "advancer_not_competing"
  | "advancer_not_allowed";

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: PredictionError };

export type SaveDecision =
  | { ok: true }
  | { ok: false; reason: PredictionError | "locked" | "match_not_found" };

/**
 * Predictions are open strictly BEFORE kickoff. At or after kickoff they are
 * locked (REQ-PRED-3, SCENARIO PRED-3: now >= kickoff → closed).
 */
export function isPredictionOpen(kickoffAt: Date, now: Date): boolean {
  return now.getTime() < kickoffAt.getTime();
}

/**
 * Validates a prediction's shape against its match.
 * - Scores must be non-negative integers (REQ-PRED-1).
 * - An advancer is required iff the match is a knockout AND the prediction is a
 *   draw, and it must be one of the two competing teams (KO-2).
 * - In every other case an advancer must be absent (REQ-PRED-2, KO-3/KO-4).
 */
export function validatePrediction(
  input: PredictionInput,
  match: MatchContext,
): ValidationResult {
  const { homeScore, awayScore, advancerTeamId } = input;

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    return { ok: false, reason: "non_integer_score" };
  }
  if (homeScore < 0 || awayScore < 0) {
    return { ok: false, reason: "negative_score" };
  }

  const isKnockoutDraw = match.round !== "group" && homeScore === awayScore;

  if (isKnockoutDraw) {
    if (advancerTeamId === null) {
      return { ok: false, reason: "advancer_required" };
    }
    if (
      advancerTeamId !== match.homeTeamId &&
      advancerTeamId !== match.awayTeamId
    ) {
      return { ok: false, reason: "advancer_not_competing" };
    }
    return { ok: true };
  }

  if (advancerTeamId !== null) {
    return { ok: false, reason: "advancer_not_allowed" };
  }
  return { ok: true };
}

/**
 * Pure decision for saving a prediction: resolves match existence, the kickoff
 * lock and shape validation in order. The action layer performs the I/O (load
 * the match, then upsert) around this; keeping the decision pure makes the whole
 * sequence unit-testable without a database.
 */
export function decideSave(
  input: PredictionInput,
  match: MatchKickoffContext | null,
  now: Date,
): SaveDecision {
  if (!match) return { ok: false, reason: "match_not_found" };
  if (!isPredictionOpen(match.kickoffAt, now)) {
    return { ok: false, reason: "locked" };
  }
  return validatePrediction(input, match);
}
