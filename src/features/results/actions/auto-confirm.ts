/**
 * autoConfirmFinished — I/O shell run by the GH Actions sync (service_role
 * client) right after scores are upserted. Confirms every newly-finished match
 * and triggers its point recompute via confirmResult. Idempotent: already-
 * confirmed matches are filtered out by result_confirmed_at (RES-1).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type ConfirmableMatchRow,
  selectConfirmable,
} from "../entities/auto-confirm";
import { confirmResult } from "./confirm-result";

export async function autoConfirmFinished(
  client: SupabaseClient,
): Promise<{ confirmed: number }> {
  const { data, error } = await client
    .from("matches")
    .select(
      "id, round, status, home_score, away_score, advancer_team_id, result_confirmed_at",
    )
    .eq("status", "finished")
    .is("result_confirmed_at", null);
  if (error) throw new Error(`load finished matches failed: ${error.message}`);

  const results = selectConfirmable(data as ConfirmableMatchRow[]);
  for (const result of results) {
    await confirmResult(client, result);
  }

  return { confirmed: results.length };
}
