"use server";

/**
 * Read the matches an admin can load or correct TODAY, UI-ready for
 * ConfirmResultForm (PRO-28). Precomputed server-side so nothing
 * non-serializable crosses the RSC boundary, mirroring the LeaderboardRow.href
 * pattern. Thin additive I/O only: no business logic.
 *
 * Why no status filter: the panel is the manual fallback when the openfootball
 * sync hasn't loaded results. Filtering to finished/confirmed hid every match
 * still `scheduled`, so an admin had nowhere to enter a result by hand. Now the
 * authority is the admin, not the cron — every match of the day shows up,
 * regardless of status, as long as both teams are known (knockout placeholders
 * are resolved in the bracket-slot section instead).
 *
 * Why "today" in AR-local: scoped to the current matchday so the admin sees the
 * handful of games being played, not all 104. The day boundary uses arDayParts
 * — the SAME America/Argentina/Buenos_Aires definition the rest of the UI shows
 * kickoffs in — so a 21:00 ART kickoff lands under the ART day, never the UTC one.
 */

import type { MatchStatus, Round } from "@/features/fixtures/entities/match";
import { arDayParts } from "@/shared/datetime";
import { createClient } from "@/shared/supabase/server";
import type { CorrectableMatch } from "../entities/correctable-match";

interface CorrectableMatchRow {
  id: string;
  round: string;
  status: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
}

export async function selectCorrectableMatches(
  now: Date = new Date(),
): Promise<CorrectableMatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id,
       round,
       status,
       kickoff_at,
       home_score,
       away_score,
       home_team:teams!matches_home_team_id_fkey(id, name),
       away_team:teams!matches_away_team_id_fkey(id, name)`,
    )
    // Both teams known: a result can only be entered for a real fixture.
    // Unresolved knockout slots live in the bracket-slot section instead.
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("kickoff_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Supabase infers embedded objects as arrays when it cannot determine FK
  // cardinality; cast through unknown to our one-to-one domain shape (same
  // approach as getMatchBreakdown).
  const rows = (data as unknown as CorrectableMatchRow[] | null) ?? [];

  // Keep only the matches whose AR-local kickoff day is today — the same day
  // definition the cards display in, so grouping never drifts from the labels.
  const todayKey = arDayParts(now).key;

  return rows
    .filter((row) => arDayParts(row.kickoff_at).key === todayKey)
    .map((row) => ({
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
      kickoffAt: row.kickoff_at,
      status: row.status as MatchStatus,
    }));
}
