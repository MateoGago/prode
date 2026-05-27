// predictions: save a user's prediction and enforce the pre-kickoff lock.
// Pure rules + types live in entities/; the save action is the I/O shell.

export { savePrediction } from "./actions/save-prediction";
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
