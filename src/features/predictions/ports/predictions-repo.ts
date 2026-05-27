/**
 * Port for persisting predictions. The Supabase adapter lives in infra/ and
 * runs under the user's session, so RLS enforces ownership + the kickoff lock.
 */

export interface UpsertPredictionInput {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancerTeamId: string | null;
}

export interface PredictionsRepo {
  /** Upsert the caller's prediction for a match (one row per user+match). */
  upsert(input: UpsertPredictionInput): Promise<void>;
}
