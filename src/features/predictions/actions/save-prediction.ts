"use server";

/**
 * savePrediction — validates and persists a user's prediction.
 *
 * Thin I/O shell: loads the authoritative match from Supabase, delegates the
 * decision to the pure `decideSave`, then upserts under the user's session so
 * RLS enforces ownership + the kickoff lock (the real authority, REQ-XCUT-5).
 */

import { createClient } from "@/shared/supabase/server";
import {
  decideSave,
  type SaveDecision,
  type UpsertPredictionInput,
} from "../entities/prediction";
import {
  type MatchContextRow,
  predictionToRow,
  rowToContext,
} from "../entities/rows";

export async function savePrediction(
  input: UpsertPredictionInput,
): Promise<SaveDecision> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select("round, home_team_id, away_team_id, kickoff_at")
    .eq("id", input.matchId)
    .maybeSingle();
  if (error) throw new Error(`read match failed: ${error.message}`);

  const match = data ? rowToContext(data as MatchContextRow) : null;
  const decision = decideSave(input, match, new Date());
  if (!decision.ok) return decision;

  const { error: upsertError } = await supabase
    .from("predictions")
    .upsert(predictionToRow(input), { onConflict: "user_id,match_id" });
  if (upsertError) {
    throw new Error(`upsert prediction failed: ${upsertError.message}`);
  }

  return { ok: true };
}
