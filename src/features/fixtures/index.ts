// fixtures: tournament teams + matches. Pure domain + openfootball transforms
// live in entities/; seed/sync (service_role I/O) live in actions/.

export { fetchRemoteDataset, loadVendoredDataset } from "./actions/dataset";
export { seedFixtures } from "./actions/seed-fixtures";
export { syncFixtures } from "./actions/sync-fixtures";
export type {
  Match,
  MatchResult,
  MatchStatus,
  Round,
  Team,
} from "./entities/match";
export { collectUniqueTeams, ROUND_MULTIPLIERS } from "./entities/match";
export {
  datasetToFixtures,
  datasetToResults,
  type OpenFootballData,
} from "./entities/openfootball";
