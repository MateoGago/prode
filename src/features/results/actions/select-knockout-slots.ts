"use server";

/**
 * Read every knockout match for the admin bracket panel, regardless of whether
 * its slots are filled. Empty slots (home_team_id / away_team_id IS NULL) get an
 * assign form; filled slots get an edit form so an admin can fix a mistaken
 * assignment. Admin use only — regular reads go through the /fixture RSC page.
 */

import { createClient } from "@/shared/supabase/server";

export interface KnockoutSlot {
  matchId: string;
  /** Knockout round label for display (e.g. "r16", "qf"). */
  round: string;
  /** Kickoff instant as an ISO 8601 UTC string — RSC→client safe. */
  kickoffAt: string;
  /** null means this slot is unresolved and needs assignment. */
  homeTeamId: string | null;
  homeTeamName: string | null;
  /** Flag of the assigned home team (null when unresolved or flag missing). */
  homeTeamFlagUrl: string | null;
  /** Raw bracket slot label for the home side (e.g. "1A", "W74"); the admin UI
   *  formats it so the admin knows which team belongs here. */
  homePlaceholder: string | null;
  awayTeamId: string | null;
  awayTeamName: string | null;
  awayTeamFlagUrl: string | null;
  awayPlaceholder: string | null;
}

interface KnockoutMatchRow {
  id: string;
  round: string;
  kickoff_at: string;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: { id: string; name: string; flag_url: string | null } | null;
  away_team: { id: string; name: string; flag_url: string | null } | null;
}

export async function selectKnockoutSlots(): Promise<KnockoutSlot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id,
       round,
       kickoff_at,
       home_placeholder,
       away_placeholder,
       home_team:teams!matches_home_team_id_fkey(id, name, flag_url),
       away_team:teams!matches_away_team_id_fkey(id, name, flag_url)`,
    )
    .eq("is_knockout", true)
    .order("kickoff_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data as unknown as KnockoutMatchRow[] | null) ?? [];

  return rows.map((row) => ({
    matchId: row.id,
    round: row.round,
    kickoffAt: row.kickoff_at,
    homeTeamId: row.home_team?.id ?? null,
    homeTeamName: row.home_team?.name ?? null,
    homeTeamFlagUrl: row.home_team?.flag_url ?? null,
    homePlaceholder: row.home_placeholder,
    awayTeamId: row.away_team?.id ?? null,
    awayTeamName: row.away_team?.name ?? null,
    awayTeamFlagUrl: row.away_team?.flag_url ?? null,
    awayPlaceholder: row.away_placeholder,
  }));
}
