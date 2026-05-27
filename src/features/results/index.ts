// results: confirm-result use-case, cron ingest, admin override
// Responsible for ingesting match results and triggering idempotent score recomputation.
export {
  type ConfirmResultOutcome,
  confirmResult,
} from "./actions/confirm-result";
export {
  type ConfirmedResult,
  type ScorablePrediction,
  type ScoredPrediction,
  scorePredictions,
} from "./entities/confirm-result";
