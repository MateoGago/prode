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
export type {
  CorrectableMatch,
  CorrectableMatchTeam,
} from "./entities/correctable-match";
export { selectCorrectableMatches } from "./actions/select-correctable-matches";
export {
  type ConfirmResultOutcome,
  confirmResult,
} from "./actions/confirm-result";
// confirmResultAction is the ONLY export of a "use server" module — Turbopack
// turns every export of such a module into a Server Action binding, so the
// ConfirmActionResult TYPE must come from the pure entity below, never here.
export { confirmResultAction } from "./actions/confirm-result-action";
export {
  type ConfirmableMatchRow,
  selectConfirmable,
} from "./entities/auto-confirm";
export {
  type ConfirmActionResult,
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
