// dashboard ("Inicio"): the player's home view, composed from fixtures,
// leaderboard and predictions reads. Pure derivation lives in entities/;
// the compose action is the I/O shell.

export { getDashboard, type DashboardData } from "./actions/get-dashboard";
export {
  countPendingPredictions,
  derivePlayerStats,
  mapLastResults,
  selectNextMatch,
  type LastResultKind,
  type LastResultRow,
  type PlayerStats,
} from "./entities/inicio";
