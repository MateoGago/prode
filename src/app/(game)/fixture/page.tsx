/**
 * /fixture — Server Component page for the Tournament Fixture view.
 *
 * Auth gate: handled by the (game) layout — no extra redirect needed here.
 *
 * Data: single Supabase join of matches + teams (same PostgREST query shape
 * as predicciones/page.tsx). Runs computeStandings, selectBestThirds, and
 * buildBracket once, then passes serializable props to <FixtureClient>.
 *
 * Note: No params/searchParams — static route. No async cookies() needed.
 * (Next.js 16: params are async on dynamic routes, not applicable here.)
 */

import {
  getCachedMatchesWithTeams,
  getCachedTeams,
} from "@/features/fixtures/actions/get-global-matches";
import { mapMatchRow } from "@/features/predictions/entities/predictions-page";
import {
  computeStandings,
  selectBestThirds,
} from "@/features/tournament/entities/standings";
import { buildBracket } from "@/features/tournament/entities/bracket";
import { FixtureClient } from "@/features/tournament/components/fixture-client";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FixturePage() {
  // Both reads are GLOBAL tournament data, served from the cross-request cache
  // (invalidated on admin confirm / slot resolve). Fetch them together.
  const [matchesData, teamsData] = await Promise.all([
    getCachedMatchesWithTeams(),
    getCachedTeams(),
  ]);

  const matches = matchesData.map(mapMatchRow);
  const teams = teamsData.map((t) => ({
    id: t.id,
    externalRef: t.external_ref,
    name: t.name,
    groupLabel: t.group_label,
    flagUrl: t.flag_url,
  }));

  // Pure derivations
  const standings = computeStandings(matches, teams);
  const bestThirds = selectBestThirds(standings);
  const bracket = buildBracket(matches, teams);

  // Qualification highlights as plain arrays (RSC→Client serializable).
  const qualifiedTeamIds = standings.flatMap((g) =>
    g.rows.slice(0, 2).map((r) => r.team.id),
  );
  const bestThirdTeamIds = bestThirds.map((r) => r.team.id);

  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Mundial 2026
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Fixture
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Posiciones por grupo y llave del torneo.
        </p>
      </header>

      <FixtureClient
        standings={standings}
        bracket={bracket}
        qualifiedTeamIds={qualifiedTeamIds}
        bestThirdTeamIds={bestThirdTeamIds}
      />
    </section>
  );
}
