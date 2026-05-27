/**
 * Pure mappers between the predictions domain and Postgres rows. No I/O — the
 * action layer runs the queries and feeds these mappers the raw rows.
 */

import type { Round } from "@/features/fixtures/entities/match";
import type { MatchKickoffContext, UpsertPredictionInput } from "./prediction";

export interface PredictionRow {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  advancer_team_id: string | null;
}

/** Maps a prediction submission to its `predictions` table row. */
export function predictionToRow(input: UpsertPredictionInput): PredictionRow {
  return {
    user_id: input.userId,
    match_id: input.matchId,
    home_score: input.homeScore,
    away_score: input.awayScore,
    advancer_team_id: input.advancerTeamId,
  };
}

export interface MatchContextRow {
  round: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
}

/** Maps a `matches` row to the domain MatchKickoffContext. */
export function rowToContext(row: MatchContextRow): MatchKickoffContext {
  return {
    round: row.round as Round,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    kickoffAt: new Date(row.kickoff_at),
  };
}
