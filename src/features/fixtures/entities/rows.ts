/**
 * Pure mappers between the fixtures domain and Postgres rows. No I/O — the
 * persist actions run the queries and feed these mappers the domain objects.
 */

import type { Match, Team } from "./match";

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
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: string | null;
  advancer_team_id: string | null;
  // result_confirmed_at is owned by the scoring engine, never written here:
  // omitting it from upserts preserves any existing value on conflict.
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
    home_score: match.homeScore,
    away_score: match.awayScore,
    penalty_winner_team_id: resolve(match.penaltyWinnerTeam),
    advancer_team_id: resolve(match.advancerTeam),
  };
}
