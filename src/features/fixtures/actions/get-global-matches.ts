import { unstable_cache } from "next/cache";

import type { MatchWithTeamsRow } from "@/features/predictions/entities/predictions-page";
import { createAdminClient } from "@/shared/supabase/admin";

/**
 * Cross-request cached readers for GLOBAL tournament data (matches + teams).
 *
 * WHY a cookie-less client: `unstable_cache` cannot access `cookies()`/`headers()`
 * inside its scope, so these readers use the service-role admin client (which
 * carries no cookies) instead of the request-scoped server client.
 *
 * SAFETY (RLS): the service role bypasses RLS. That is acceptable here ONLY
 * because every column selected below is GLOBAL — identical for every user
 * (fixtures, scores, teams). NEVER add a per-user column (predictions, points,
 * membership) to these selects: it would be cached once and served to everyone.
 *
 * FRESHNESS: matches/teams change only when an admin confirms a result, resolves
 * a bracket slot, or the openfootball sync runs. The `revalidate` TTLs are just a
 * fallback — the authoritative invalidation is on-demand via `revalidateTag` in
 * those actions (see confirm-result-action / resolve-slot-action). Product
 * decision: scores refresh when the admin confirms, not live during a match.
 */

// Canonical matches+teams join — the SAME shape predicciones, fixture and the
// dashboard already feed to mapMatchRow. Centralised so a cached read and any
// direct read can never drift.
const MATCHES_WITH_TEAMS_SELECT = `
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
`;

export interface TeamRow {
  id: string;
  external_ref: string;
  name: string;
  group_label: string | null;
  flag_url: string | null;
}

/**
 * Matches with embedded teams, ordered by kickoff. Returns RAW rows (plain JSON,
 * no Date objects) so the cached value stays stable across hit/miss; callers run
 * `mapMatchRow` themselves. Tag: "matches".
 */
export const getCachedMatchesWithTeams = unstable_cache(
  async (): Promise<MatchWithTeamsRow[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("matches")
      .select(MATCHES_WITH_TEAMS_SELECT)
      .order("kickoff_at", { ascending: true });
    if (error) throw new Error(`load matches failed: ${error.message}`);
    return (data ?? []) as unknown as MatchWithTeamsRow[];
  },
  ["global-matches-with-teams"],
  { tags: ["matches"], revalidate: 300 },
);

/** All teams (frozen post-seed). Tag: "teams". */
export const getCachedTeams = unstable_cache(
  async (): Promise<TeamRow[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("teams")
      .select("id, external_ref, name, group_label, flag_url");
    if (error) throw new Error(`load teams failed: ${error.message}`);
    return (data ?? []) as TeamRow[];
  },
  ["global-teams"],
  { tags: ["teams"], revalidate: 86400 },
);

/** Group-stage match count — the "X/72" denominator. Tag: "matches". */
export const getCachedGroupStageMatchCount = unstable_cache(
  async (): Promise<number> => {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("round", "group");
    if (error) throw new Error(`count group matches failed: ${error.message}`);
    return count ?? 0;
  },
  ["global-group-stage-match-count"],
  { tags: ["matches"], revalidate: 300 },
);
