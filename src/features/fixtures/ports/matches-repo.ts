/**
 * Port (interface) for persisting match/team data.
 *
 * The seed use-case depends on this interface; the Supabase adapter lives in infra/.
 */

import type { Match, Team } from "../model";

export interface MatchesRepo {
  /**
   * Upsert a batch of teams by their externalRef.
   * Idempotent: re-running with the same data is a no-op.
   */
  upsertTeams(teams: Team[]): Promise<void>;

  /**
   * Upsert a batch of matches by their externalRef.
   * Idempotent: re-running with the same data is a no-op.
   */
  upsertMatches(matches: Match[]): Promise<void>;
}
