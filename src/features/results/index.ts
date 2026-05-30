// results: confirm-result use-case, cron ingest, admin override
// Responsible for ingesting match results and triggering idempotent score recomputation.

export { autoConfirmFinished } from "./actions/auto-confirm";
export {
  ConfirmResultForm,
  type ConfirmResultFormProps,
  type ConfirmResultTeamOption,
} from "./components/confirm-result-form";
export {
  type ConfirmResultFormValues,
  confirmResultFormSchema,
} from "./entities/confirm-result-form-schema";
export {
  type CorrectableMatch,
  selectCorrectableMatches,
} from "./actions/select-correctable-matches";
export {
  type ConfirmResultOutcome,
  confirmResult,
} from "./actions/confirm-result";
export {
  type ConfirmActionResult,
  confirmResultAction,
} from "./actions/confirm-result-action";
export {
  type ConfirmableMatchRow,
  selectConfirmable,
} from "./entities/auto-confirm";
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
