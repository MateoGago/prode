/**
 * SupabaseMatchesRepo — implements MatchesRepo against Postgres via supabase-js.
 *
 * Used only by the seed script, which runs with the service_role key and so
 * bypasses RLS. The pure row mappers (teamToRow, matchToRow) are exported and
 * unit-tested; the class itself is a thin I/O shell verified by running a seed.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Match, Team } from "../model";
import type { MatchesRepo } from "../ports/matches-repo";

export interface TeamRow {
  external_ref: string;
  name: string;
  group_label: string | null;
  flag_url: string | null;
}

export interface MatchRow {
  external_ref: string;
  round: string;
  multiplier: number;
  matchday: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  kickoff_at: string;
  status: string;
}

/** Maps a domain Team to its `teams` table row. */
export function teamToRow(team: Team): TeamRow {
  return {
    external_ref: team.externalRef,
    name: team.name,
    group_label: team.groupLabel,
    flag_url: team.flagUrl,
  };
}

/**
 * Maps a domain Match to its `matches` table row, resolving each team's
 * externalRef to its DB uuid. Unknown refs (and knockout placeholders) resolve
 * to null, leaving the placeholder strings to identify the slot.
 */
export function matchToRow(
  match: Match,
  teamIdByRef: Map<string, string>,
): MatchRow {
  const resolve = (team: Team | null): string | null =>
    team ? (teamIdByRef.get(team.externalRef) ?? null) : null;

  return {
    external_ref: match.externalRef,
    round: match.round,
    multiplier: match.multiplier,
    matchday: match.matchday,
    home_team_id: resolve(match.homeTeam),
    away_team_id: resolve(match.awayTeam),
    home_placeholder: match.homePlaceholder,
    away_placeholder: match.awayPlaceholder,
    kickoff_at: match.kickoffAt.toISOString(),
    status: match.status,
  };
}

export class SupabaseMatchesRepo implements MatchesRepo {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async upsertTeams(teams: Team[]): Promise<void> {
    const { error } = await this.client
      .from("teams")
      .upsert(teams.map(teamToRow), { onConflict: "external_ref" });
    if (error) throw new Error(`upsertTeams failed: ${error.message}`);
  }

  async upsertMatches(matches: Match[]): Promise<void> {
    // Matches FK-reference teams by uuid; resolve refs from the freshly upserted rows.
    const { data, error } = await this.client
      .from("teams")
      .select("id, external_ref");
    if (error) throw new Error(`resolving team ids failed: ${error.message}`);

    const rows = data as Array<{ id: string; external_ref: string }>;
    const teamIdByRef = new Map(rows.map((t) => [t.external_ref, t.id]));

    const { error: upsertError } = await this.client.from("matches").upsert(
      matches.map((m) => matchToRow(m, teamIdByRef)),
      { onConflict: "external_ref" },
    );
    if (upsertError) {
      throw new Error(`upsertMatches failed: ${upsertError.message}`);
    }
  }
}
