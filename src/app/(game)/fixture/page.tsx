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
  mapMatchRow,
  type MatchWithTeamsRow,
} from "@/features/predictions/entities/predictions-page";
import {
  computeStandings,
  selectBestThirds,
} from "@/features/tournament/entities/standings";
import { buildBracket } from "@/features/tournament/entities/bracket";
import { FixtureClient } from "@/features/tournament/components/fixture-client";
import { createClient } from "@/shared/supabase/server";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FixturePage() {
  const supabase = await createClient();

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(
      `
      id,
      external_ref,
      round,
      multiplier,
      matchday,
      home_placeholder,
      away_placeholder,
      kickoff_at,
      status,
      home_score,
      away_score,
      result_confirmed_at,
      home_team:teams!matches_home_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      ),
      away_team:teams!matches_away_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      )
    `,
    )
    .order("kickoff_at", { ascending: true });

  if (matchesError) {
    throw new Error(`load matches failed: ${matchesError.message}`);
  }

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("id, external_ref, name, group_label, flag_url");

  if (teamsError) {
    throw new Error(`load teams failed: ${teamsError.message}`);
  }

  const matches = ((matchesData ?? []) as MatchWithTeamsRow[]).map(mapMatchRow);
  const teams = (teamsData ?? []).map((t) => ({
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
