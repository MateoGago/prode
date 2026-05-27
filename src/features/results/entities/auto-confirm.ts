/**
 * Auto-confirm selection — pure. The GH Actions sync upserts scores and flips
 * played matches to 'finished'; this decides which ones to confirm.
 */

import type { Round } from "@/features/fixtures/entities/match";
import type { ConfirmedResult } from "./confirm-result";

/** The slice of a `matches` row auto-confirm reads. */
export interface ConfirmableMatchRow {
  id: string;
  round: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  advancer_team_id: string | null;
  result_confirmed_at: string | null;
}

type FinishedMatchRow = ConfirmableMatchRow & {
  home_score: number;
  away_score: number;
};

/**
 * RES-1: a match is confirmable once it has finished with a final score and has
 * NEVER been confirmed. result_confirmed_at is the idempotency guard — the sync
 * preserves it across re-runs, so a re-synced confirmed match (even one whose
 * status got clobbered back to 'finished') is never re-confirmed.
 */
function isConfirmable(match: ConfirmableMatchRow): match is FinishedMatchRow {
  return (
    match.status === "finished" &&
    match.result_confirmed_at === null &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

export function selectConfirmable(
  rows: ConfirmableMatchRow[],
): ConfirmedResult[] {
  return rows.filter(isConfirmable).map((row) => ({
    matchId: row.id,
    round: row.round as Round,
    homeScore: row.home_score,
    awayScore: row.away_score,
    advancerTeamId: row.advancer_team_id,
  }));
}
