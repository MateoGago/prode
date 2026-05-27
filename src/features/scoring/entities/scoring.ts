/**
 * Scoring engine — pure domain module (REQ-SCORE-1). No Next.js / Supabase /
 * infra imports; unit-testable in isolation. The heart of the prode.
 */

import {
  ROUND_MULTIPLIERS,
  type Round,
} from "@/features/fixtures/entities/match";

/** The pair of goals scoring compares — [home, away]. */
export interface Scoreline {
  homeScore: number;
  awayScore: number;
}

/** The 1-X-2 outcome of a scoreline — what "correct direction" compares. */
type Outcome = "home" | "away" | "draw";

function outcome({ homeScore, awayScore }: Scoreline): Outcome {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

/**
 * Points for a single prediction against the confirmed result.
 *
 * Categories are EXCLUSIVE — the highest applicable base tier is awarded
 * (REQ-SCORE-2, REQ-XCUT-7), then scaled by the round multiplier (REQ-SCORE-4).
 */
export function calculatePoints(
  prediction: Scoreline,
  result: Scoreline,
  round: Round,
): number {
  return basePoints(prediction, result) * ROUND_MULTIPLIERS[round];
}

/** The exclusive base tier: 3 (exact), 1 (direction), or 0 (REQ-SCORE-2). */
function basePoints(prediction: Scoreline, result: Scoreline): 0 | 1 | 3 {
  if (
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore
  ) {
    return 3;
  }
  if (outcome(prediction) === outcome(result)) {
    return 1;
  }
  return 0;
}
