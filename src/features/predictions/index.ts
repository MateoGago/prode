// predictions: save a user's prediction and enforce the pre-kickoff lock.
// Pure rules + types live in entities/; the save action is the I/O shell.

export { getPredictionsProgress } from "./actions/get-predictions-progress";
export { saveBatchPredictions } from "./actions/save-batch-predictions";
export { savePrediction } from "./actions/save-prediction";
export { AdvancerPicker } from "./components/advancer-picker";
export { BatchBar } from "./components/batch-bar";
export { FilterSegment } from "./components/filter-segment";
export { GroupNav } from "./components/group-nav";
export { MatchCard } from "./components/match-card";
export { GroupSection } from "./components/group-section";
export { PredictionsPageClient } from "./components/predictions-page-client";
export { ProgressHeader } from "./components/progress-header";
export {
  PredictionsProvider,
  usePredictionsBoard,
} from "./components/predictions-provider";
export type { AdvancerPickerProps } from "./components/advancer-picker";
export type { MatchCardProps } from "./components/match-card";
export type { GroupSectionProps } from "./components/group-section";
export type { PredictionsPageClientProps } from "./components/predictions-page-client";
export type {
  PredictionsBoardContext,
  PredictionsProviderProps,
} from "./components/predictions-provider";
export { decideBatch } from "./entities/batch";
export type {
  BatchResultEntry,
  BatchSaveInput,
  BatchSaveResult,
} from "./entities/batch";
export type { GroupBlock } from "./entities/predictions-page";
export type {
  MatchContext,
  MatchKickoffContext,
  Prediction,
  PredictionInput,
  SaveDecision,
  UpsertPredictionInput,
} from "./entities/prediction";
export {
  decideSave,
  isPredictionOpen,
  validatePrediction,
} from "./entities/prediction";
export {
  deriveHit,
  type HitType,
  shouldShowAdvancer,
} from "./entities/match-card-state";
export {
  deriveCardState,
  deriveGroupProgress,
  deriveLock,
  deriveProgress,
  dirtySet,
  effectivePrediction,
  filterPredicate,
  isDirty,
  selectBatch,
} from "./entities/predictions-board";
export type {
  BoardMatch,
  CardState,
  FilterKind,
  GroupMatchIds,
  GroupProgress,
  LockInfo,
  LockableMatch,
  MatchStatus,
  PredictionProgress,
  Progress,
  UpsertItem,
} from "./entities/predictions-board";
