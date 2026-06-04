"use server";

/**
 * Read knockout matches that still have at least one unresolved slot
 * (home_team_id IS NULL OR away_team_id IS NULL). Admin use only — regular
 * reads go through the /fixture RSC page.
 */

import { createClient } from "@/shared/supabase/server";

export interface UnresolvedSlot {
  matchId: string;
  /** Knockout round label for display (e.g. "r16", "qf"). */
  round: string;
  /** null means this slot is unresolved and needs assignment. */
  homeTeamId: string | null;
  homeTeamName: string | null;
  awayTeamId: string | null;
  awayTeamName: string | null;
}

interface UnresolvedMatchRow {
  id: string;
  round: string;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
}

export async function selectUnresolvedKnockoutSlots(): Promise<
  UnresolvedSlot[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id,
       round,
       home_team:teams!matches_home_team_id_fkey(id, name),
       away_team:teams!matches_away_team_id_fkey(id, name)`,
    )
    .eq("is_knockout", true)
    .or("home_team_id.is.null,away_team_id.is.null")
    .order("kickoff_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data as unknown as UnresolvedMatchRow[] | null) ?? [];

  return rows.map((row) => ({
    matchId: row.id,
    round: row.round,
    homeTeamId: row.home_team?.id ?? null,
    homeTeamName: row.home_team?.name ?? null,
    awayTeamId: row.away_team?.id ?? null,
    awayTeamName: row.away_team?.name ?? null,
  }));
}
