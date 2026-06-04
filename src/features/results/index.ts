// results: confirm-result use-case, cron ingest, admin override, bracket slot resolution
// Responsible for ingesting match results, triggering idempotent score recomputation,
// and allowing admins to manually assign teams to unresolved knockout bracket slots.

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
// confirmResultAction and resolveSlotAction are the ONLY exports of "use server"
// modules — Turbopack turns every export of such a module into a Server Action
// binding, so types must come from the pure entity modules, never from here.
export { confirmResultAction } from "./actions/confirm-result-action";
export { resolveSlotAction } from "./actions/resolve-slot-action";
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
// Pure types for bracket slot resolution — exported from the entity (NOT from
// the "use server" action module).
export {
  type ResolveSlotError,
  type ResolveSlotInput,
  type ResolveSlotResult,
  type Slot,
  validateResolveSlot,
} from "./entities/resolve-slot";
export {
  ResolveSlotForm,
  type ResolveSlotFormProps,
  type ResolveSlotFormTeamOption,
} from "./components/resolve-slot-form";
