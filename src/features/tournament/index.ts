/**
 * tournament feature — barrel export.
 *
 * Domain functions:
 *   computeStandings, selectBestThirds, resolveHeadToHead (standings)
 *   buildBracket, formatPlaceholder (bracket)
 *
 * Components:
 *   StandingsTable, BracketView, FixtureClient
 */

// Domain
export {
  computeStandings,
  selectBestThirds,
  resolveHeadToHead,
  type GroupStandings,
  type TeamStanding,
} from "./entities/standings";

export {
  buildBracket,
  formatPlaceholder,
  type BracketRound,
  type BracketMatch,
  type BracketSlot,
} from "./entities/bracket";

// Components
export { StandingsTable } from "./components/standings-table";
export { BracketView } from "./components/bracket-view";
export { FixtureClient } from "./components/fixture-client";
