// leaderboard: ranking, per-match breakdown
// Responsible for presenting the leaderboard view (total_points DESC, shared rank on ties).
export {
  LeaderboardTable,
  type LeaderboardRow,
  type LeaderboardTableProps,
} from "./components/leaderboard-table";
export {
  MatchBreakdownList,
  type MatchBreakdownItem,
  type MatchBreakdownListProps,
} from "./components/match-breakdown-list";
export { getLeaderboard } from "./actions/get-leaderboard";
export { getMatchBreakdown } from "./actions/get-match-breakdown";
export {
  mapLeaderboardRows,
  rankByPoints,
  type GetLeaderboardRpcRow,
  type Ranked,
} from "./entities/leaderboard";
export {
  mapMatchBreakdown,
  type BreakdownPredictionRow,
} from "./entities/match-breakdown";
