// results: confirm-result use-case, cron ingest, admin override
// Responsible for ingesting match results and triggering idempotent score recomputation.

export {
  type ConfirmResultOutcome,
  confirmResult,
} from "./actions/confirm-result";
export {
  type ConfirmActionResult,
  confirmResultAction,
} from "./actions/confirm-result-action";
export {
  type ConfirmedResult,
  type ResultError,
  type ResultInput,
  type ResultMatchContext,
  type ResultValidation,
  type ScorablePrediction,
  type ScoredPrediction,
  scorePredictions,
  validateResultInput,
} from "./entities/confirm-result";
