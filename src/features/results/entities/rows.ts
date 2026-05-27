/**
 * Pure mappers between the results domain and Postgres rows. No I/O — the
 * action layer runs the queries and feeds these mappers the raw rows.
 */

import type { ConfirmedResult, ScorablePrediction } from "./confirm-result";

/** The slice of a `predictions` row the scoring engine needs. */
export interface PredictionScoreRow {
  id: string;
  home_score: number;
  away_score: number;
}

/** Maps a `predictions` row to the domain ScorablePrediction. */
export function rowToScorablePrediction(
  row: PredictionScoreRow,
): ScorablePrediction {
  return {
    id: row.id,
    homeScore: row.home_score,
    awayScore: row.away_score,
  };
}

/** The `matches` columns written when a result is confirmed. */
export interface MatchResultUpdate {
  status: "confirmed";
  home_score: number;
  away_score: number;
  advancer_team_id: string | null;
  result_confirmed_at: string;
}

/** Maps a confirmed result to its `matches` update row (status → confirmed). */
export function resultToMatchUpdate(
  result: ConfirmedResult,
  confirmedAt: Date,
): MatchResultUpdate {
  return {
    status: "confirmed",
    home_score: result.homeScore,
    away_score: result.awayScore,
    advancer_team_id: result.advancerTeamId,
    result_confirmed_at: confirmedAt.toISOString(),
  };
}
