/**
 * syncFixtures — use-case that refreshes match state from the live data source.
 *
 * Unlike seedFixtures, this upserts MATCHES ONLY. It deliberately does NOT
 * upsert teams: the 48 teams are a fixed set, seeded once with their localized
 * (Spanish) names and flags. Re-touching them on every scheduled sync would be
 * a redundant write whose only effect could be to clobber that display data, so
 * we skip it. Teams are assumed to already exist (run seedFixtures first).
 *
 * What DOES change over the tournament — and is persisted here — lives entirely
 * on matches: scores, status, and the knockout bracket resolving from
 * placeholders ("1A", "W73") to real team references. upsertMatches handles all
 * of that, resolving team refs against the already-seeded teams table.
 *
 * Idempotent by externalRef. Safe to run on a schedule.
 *
 * This use-case has NO knowledge of Supabase, HTTP, or Next.js — dependencies
 * arrive via ports (dependency injection).
 */

import type { MatchDataProvider } from "../ports/match-data-provider";
import type { MatchesRepo } from "../ports/matches-repo";

interface SyncFixturesDeps {
  provider: MatchDataProvider;
  repo: MatchesRepo;
}

/** Fetch current fixtures from `provider` and persist match state via `repo`. */
export async function syncFixtures({
  provider,
  repo,
}: SyncFixturesDeps): Promise<void> {
  const matches = await provider.getFixtures();
  await repo.upsertMatches(matches);
}
