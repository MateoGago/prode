/**
 * seedFixtures — use-case that populates the database with tournament fixtures.
 *
 * Algorithm:
 * 1. Fetch all fixtures from the MatchDataProvider (e.g. ApiFootballProvider).
 * 2. Extract unique teams (deduplicated by externalRef). Null teams (placeholder
 *    knockout slots) are skipped — no team row to create yet.
 * 3. Upsert teams FIRST — matches have FK references to teams.
 * 4. Upsert matches (idempotent by externalRef).
 *
 * Idempotency: re-running produces the same result. The repo layer handles
 * the actual upsert (INSERT ... ON CONFLICT DO UPDATE). Calling seedFixtures
 * twice in a row is safe and leaves the DB in a consistent state.
 *
 * This use-case has NO knowledge of Supabase, HTTP, or Next.js.
 * Dependencies arrive via ports (dependency injection).
 */

import type { Team } from "../model";
import type { MatchDataProvider } from "../ports/match-data-provider";
import type { MatchesRepo } from "../ports/matches-repo";

interface SeedFixturesDeps {
  provider: MatchDataProvider;
  repo: MatchesRepo;
}

/**
 * Fetch fixtures from `provider` and persist them via `repo`.
 * Teams are upserted before matches to satisfy FK constraints.
 */
export async function seedFixtures({
  provider,
  repo,
}: SeedFixturesDeps): Promise<void> {
  const matches = await provider.getFixtures();

  // Collect unique teams by externalRef.
  // Null teams are skipped — placeholder slots have no team entity to create.
  const teamsByRef = new Map<string, Team>();
  for (const match of matches) {
    if (match.homeTeam !== null) {
      teamsByRef.set(match.homeTeam.externalRef, match.homeTeam);
    }
    if (match.awayTeam !== null) {
      teamsByRef.set(match.awayTeam.externalRef, match.awayTeam);
    }
  }

  const uniqueTeams = Array.from(teamsByRef.values());

  // Teams must exist before matches (FK constraint in the DB).
  await repo.upsertTeams(uniqueTeams);
  await repo.upsertMatches(matches);
}
