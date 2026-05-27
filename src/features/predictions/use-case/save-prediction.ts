/**
 * savePrediction — validates and persists a user's prediction.
 *
 * Pure-orchestration use-case: it loads the authoritative match context, applies
 * the kickoff lock and shape validation (both pure), then upserts via the repo.
 * The DB RLS + triggers are the real authority (REQ-XCUT-5); this layer exists
 * to fail fast with a precise reason before touching the database.
 */

import {
  isPredictionOpen,
  type PredictionError,
  validatePrediction,
} from "../domain/prediction-rules";
import type { MatchReader } from "../ports/match-reader";
import type {
  PredictionsRepo,
  UpsertPredictionInput,
} from "../ports/predictions-repo";

export type SavePredictionResult =
  | { ok: true }
  | { ok: false; reason: PredictionError | "locked" | "match_not_found" };

export interface SavePredictionDeps {
  predictions: PredictionsRepo;
  matches: MatchReader;
  /** Injectable clock; defaults to the real wall clock. */
  now?: () => Date;
}

export async function savePrediction(
  input: UpsertPredictionInput,
  deps: SavePredictionDeps,
): Promise<SavePredictionResult> {
  const now = deps.now ? deps.now() : new Date();

  const match = await deps.matches.getContext(input.matchId);
  if (!match) return { ok: false, reason: "match_not_found" };

  if (!isPredictionOpen(match.kickoffAt, now)) {
    return { ok: false, reason: "locked" };
  }

  const validation = validatePrediction(input, match);
  if (!validation.ok) return validation;

  await deps.predictions.upsert(input);
  return { ok: true };
}
