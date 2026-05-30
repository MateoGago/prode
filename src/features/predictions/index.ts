// predictions: save a user's prediction and enforce the pre-kickoff lock.
// Pure rules + types live in entities/; the save action is the I/O shell.

export { savePrediction } from "./actions/save-prediction";
export { AdvancerPicker } from "./components/advancer-picker";
export { MatchCard } from "./components/match-card";
export { GroupSection } from "./components/group-section";
export { PredictionsPageClient } from "./components/predictions-page-client";
export type { AdvancerPickerProps } from "./components/advancer-picker";
export type { MatchCardProps } from "./components/match-card";
export type { GroupSectionProps } from "./components/group-section";
export type { PredictionsPageClientProps } from "./components/predictions-page-client";
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
