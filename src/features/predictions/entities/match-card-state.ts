/**
 * Pure presentation rules for the MatchCard's Cancha Pop states. No infra/
 * framework imports — derived client-side for instant feedback, but cosmetic:
 * scoring + lock authority live in Postgres (REQ-XCUT-5). Kept pure so the
 * advancer-picker visibility and the confirmed-hit badge are unit-testable
 * without rendering.
 */

import type { Round } from "@/features/fixtures/entities/match";

/**
 * The advancer picker appears ONLY when the match is a knockout AND the
 * predicted score is a draw — mirrors validatePrediction's isKnockoutDraw so
 * the UI asks "who advances?" exactly when the save action will require it.
 */
export function shouldShowAdvancer(
  round: Round,
  homeScore: number,
  awayScore: number,
): boolean {
  return round !== "group" && homeScore === awayScore;
}

/** Outcome of a confirmed prediction vs. the real result. */
export type HitType = "exact" | "winner" | "miss";

/** Which side won a scoreline (or a draw). */
function outcome(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Derives the confirmed-state badge:
 * - "exact"  → both scores match the real result.
 * - "winner" → not exact, but the predicted winner/draw matches.
 * - "miss"   → wrong outcome.
 */
export function deriveHit(
  predicted: { homeScore: number; awayScore: number },
  actual: { homeScore: number; awayScore: number },
): HitType {
  if (
    predicted.homeScore === actual.homeScore &&
    predicted.awayScore === actual.awayScore
  ) {
    return "exact";
  }
  if (
    outcome(predicted.homeScore, predicted.awayScore) ===
    outcome(actual.homeScore, actual.awayScore)
  ) {
    return "winner";
  }
  return "miss";
}
