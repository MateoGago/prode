/**
 * Port (interface) for fetching tournament data from an external football data source.
 *
 * Implementations live in infra/ (e.g. StaticFixtureProvider).
 * Use-cases and domain logic depend ONLY on this interface — never on the concrete adapter.
 */

import type { Match, MatchResult } from "../model";

export interface MatchDataProvider {
  /**
   * Fetch all fixtures for the tournament.
   * Returns matches in their current state (teams may be null for future knockout slots).
   */
  getFixtures(): Promise<Match[]>;

  /**
   * Fetch results for matches that have finished.
   * Returns only matches with final scores; the caller decides which to confirm.
   */
  getResults(): Promise<MatchResult[]>;
}
