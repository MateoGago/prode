"use server";

/**
 * Read the matches an admin can correct, UI-ready for ConfirmResultForm (PRO-28).
 * Returns matchId, round and the two competing teams (id + name) — precomputed
 * server-side so nothing non-serializable crosses the RSC boundary, mirroring
 * the LeaderboardRow.href pattern. Thin additive I/O only: no business logic.
 */

import type { Round } from "@/features/fixtures/entities/match";
import type { ConfirmResultTeamOption } from "../components/confirm-result-form";
import { createClient } from "@/shared/supabase/server";

export interface CorrectableMatch {
  matchId: string;
  round: Round;
  homeTeam: ConfirmResultTeamOption | null;
  awayTeam: ConfirmResultTeamOption | null;
  homeScore: number | null;
  awayScore: number | null;
}

interface CorrectableMatchRow {
  id: string;
  round: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
}

export async function selectCorrectableMatches(): Promise<CorrectableMatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id,
       round,
       home_score,
       away_score,
       home_team:teams!matches_home_team_id_fkey(id, name),
       away_team:teams!matches_away_team_id_fkey(id, name)`,
    )
    // Only matches with a real result to set or override.
    .in("status", ["finished", "confirmed"])
    .order("kickoff_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Supabase infers embedded objects as arrays when it cannot determine FK
  // cardinality; cast through unknown to our one-to-one domain shape (same
  // approach as getMatchBreakdown).
  const rows = (data as unknown as CorrectableMatchRow[] | null) ?? [];

  return rows.map((row) => ({
    matchId: row.id,
    round: row.round as Round,
    homeTeam: row.home_team
      ? { id: row.home_team.id, name: row.home_team.name }
      : null,
    awayTeam: row.away_team
      ? { id: row.away_team.id, name: row.away_team.name }
      : null,
    homeScore: row.home_score,
    awayScore: row.away_score,
  }));
}
