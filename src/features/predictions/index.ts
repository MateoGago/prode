// predictions: save a user's prediction and enforce the pre-kickoff lock.
// Pure rules + types live in entities/; the save action is the I/O shell.

export { savePrediction } from "./actions/save-prediction";
export { MatchCard } from "./components/match-card";
export { GroupSection } from "./components/group-section";
export { PredictionsPageClient } from "./components/predictions-page-client";
export type { MatchCardProps } from "./components/match-card";
export type { GroupSectionProps } from "./components/group-section";
export type {
  GroupBlock,
  PredictionsPageClientProps,
} from "./components/predictions-page-client";
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
