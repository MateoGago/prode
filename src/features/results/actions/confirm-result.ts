/**
 * confirmResult — I/O shell that confirms a match result and recomputes points.
 *
 * Runs with a service_role client (bypasses RLS + the guard_points_awarded
 * trigger, which blocks every other role from writing points_awarded). The
 * caller owns auth gating and builds the client: the admin Server Action
 * (PRO-28) and the ingest cron (PRO-29). The pure recomputation lives in
 * entities/confirm-result.ts; this shell just issues the queries.
 *
 * Recomputation runs EXACTLY ONCE per call and overwrites points from scratch,
 * so confirming — or re-confirming a corrected score — is idempotent
 * (REQ-RES-4, REQ-RES-8, SCORE-11, RES-4).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type ConfirmedResult,
  scorePredictions,
} from "../entities/confirm-result";
import {
  type PredictionScoreRow,
  resultToMatchUpdate,
  rowToScorablePrediction,
} from "../entities/rows";

export interface ConfirmResultOutcome {
  /** How many predictions were rescored for this match. */
  recomputed: number;
}

export async function confirmResult(
  client: SupabaseClient,
  result: ConfirmedResult,
  now: Date = new Date(),
): Promise<ConfirmResultOutcome> {
  // 1. Confirm the match: status → confirmed, final score, advancer.
  const { error: matchError } = await client
    .from("matches")
    .update(resultToMatchUpdate(result, now))
    .eq("id", result.matchId);
  if (matchError) {
    throw new Error(`confirm match failed: ${matchError.message}`);
  }

  // 2. Load every prediction for the match (full set — RES-4 recomputes all).
  const { data, error: readError } = await client
    .from("predictions")
    .select("id, home_score, away_score")
    .eq("match_id", result.matchId);
  if (readError) {
    throw new Error(`load predictions failed: ${readError.message}`);
  }

  // 3. Recompute points purely, then 4. persist each absolute value by id.
  const scored = scorePredictions(
    (data as PredictionScoreRow[]).map(rowToScorablePrediction),
    result,
  );

  for (const { id, pointsAwarded } of scored) {
    const { error: writeError } = await client
      .from("predictions")
      .update({ points_awarded: pointsAwarded })
      .eq("id", id);
    if (writeError) {
      throw new Error(`write points for ${id} failed: ${writeError.message}`);
    }
  }

  return { recomputed: scored.length };
}
