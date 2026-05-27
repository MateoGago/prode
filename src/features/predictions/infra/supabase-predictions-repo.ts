/**
 * SupabasePredictionsRepo — persists predictions via supabase-js.
 *
 * Runs under the USER's session client (not service_role), so RLS enforces
 * ownership and the kickoff lock (pred_insert_open/pred_update_open), and the
 * guard_points_awarded trigger forces points to 0. The pure mapper is tested;
 * the upsert itself is a thin shell verified end-to-end once auth is wired.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PredictionsRepo,
  UpsertPredictionInput,
} from "../ports/predictions-repo";

export interface PredictionRow {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  advancer_team_id: string | null;
}

/** Maps a prediction input to its `predictions` table row. */
export function predictionToRow(input: UpsertPredictionInput): PredictionRow {
  return {
    user_id: input.userId,
    match_id: input.matchId,
    home_score: input.homeScore,
    away_score: input.awayScore,
    advancer_team_id: input.advancerTeamId,
  };
}

export class SupabasePredictionsRepo implements PredictionsRepo {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async upsert(input: UpsertPredictionInput): Promise<void> {
    const { error } = await this.client
      .from("predictions")
      .upsert(predictionToRow(input), { onConflict: "user_id,match_id" });
    if (error) throw new Error(`upsert prediction failed: ${error.message}`);
  }
}
