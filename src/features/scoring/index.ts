// scoring: points engine (PURE — no framework/infra imports)
// Responsible for calculating points from match results and user predictions.
// calculatePoints(prediction, result, round): number — deterministic, no I/O.
export { calculatePoints, type Scoreline } from "./entities/scoring";
